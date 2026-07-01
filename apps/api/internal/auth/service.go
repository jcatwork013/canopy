package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountInactive    = errors.New("account is not active")
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidInput       = errors.New("invalid input")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

// Mailer sends transactional email (satisfied by internal/mailer.Mailer).
type Mailer interface {
	Send(ctx context.Context, to, subject, html string) error
}

type Tokens struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

type Service struct {
	repo       *Repo
	tm         *TokenManager
	mailer     Mailer
	appBaseURL string
}

func NewService(repo *Repo, tm *TokenManager, mailer Mailer, appBaseURL string) *Service {
	return &Service{repo: repo, tm: tm, mailer: mailer, appBaseURL: strings.TrimRight(appBaseURL, "/")}
}

// Login authenticates a user and returns the user + a fresh token pair.
func (s *Service) Login(ctx context.Context, email, password string) (*User, *Tokens, error) {
	u, err := s.repo.GetByEmail(ctx, strings.TrimSpace(email))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, err
	}
	if !CheckPassword(u.PasswordHash, password) {
		return nil, nil, ErrInvalidCredentials
	}
	if u.AccountStatus != "active" {
		return nil, nil, ErrAccountInactive
	}
	tokens, err := s.issue(ctx, u)
	if err != nil {
		return nil, nil, err
	}
	return u, tokens, nil
}

// Refresh rotates a refresh token: the old one is revoked and a new pair issued.
func (s *Service) Refresh(ctx context.Context, refreshToken string) (*Tokens, error) {
	hash := HashToken(refreshToken)
	userID, err := s.repo.FindRefresh(ctx, hash)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if err := s.repo.RevokeRefresh(ctx, hash); err != nil {
		return nil, err
	}
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	return s.issue(ctx, u)
}

// Logout revokes a refresh token (best-effort).
func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	return s.repo.RevokeRefresh(ctx, HashToken(refreshToken))
}

func (s *Service) Me(ctx context.Context, id uuid.UUID) (*User, error) {
	return s.repo.GetByID(ctx, id)
}

// Register creates a self-service account (active but email-unverified), logs it
// in, and sends a verification email (best-effort).
func (s *Service) Register(ctx context.Context, email, password, fullName, phone string) (*User, *Tokens, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || len(password) < 8 || strings.TrimSpace(fullName) == "" {
		return nil, nil, ErrInvalidInput
	}
	exists, err := s.repo.EmailExists(ctx, email)
	if err != nil {
		return nil, nil, err
	}
	if exists {
		return nil, nil, ErrEmailTaken
	}
	hash, err := HashPassword(password)
	if err != nil {
		return nil, nil, err
	}
	u, err := s.repo.CreateUser(ctx, email, hash, strings.TrimSpace(fullName), strings.TrimSpace(phone))
	if err != nil {
		return nil, nil, err
	}
	tokens, err := s.issue(ctx, u)
	if err != nil {
		return nil, nil, err
	}
	s.sendVerification(ctx, u)
	return u, tokens, nil
}

// VerifyEmail consumes a verification token and marks the user verified.
func (s *Service) VerifyEmail(ctx context.Context, token string) error {
	if strings.TrimSpace(token) == "" {
		return ErrInvalidInput
	}
	userID, err := s.repo.ConsumeEmailToken(ctx, "verify_email", HashToken(token))
	if err != nil {
		return ErrInvalidToken
	}
	return s.repo.SetEmailVerified(ctx, userID)
}

// ResendVerification re-sends the email for an existing, unverified account.
// Always succeeds from the caller's view (no account enumeration).
func (s *Service) ResendVerification(ctx context.Context, email string) {
	u, err := s.repo.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if err != nil || u.EmailVerifiedAt != nil {
		return
	}
	s.sendVerification(ctx, u)
}

// ForgotPassword emails a reset link if the account exists (silent otherwise).
func (s *Service) ForgotPassword(ctx context.Context, email string) {
	u, err := s.repo.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		return
	}
	raw, hash, err := NewRefreshToken()
	if err != nil {
		return
	}
	if err := s.repo.StoreEmailToken(ctx, u.ID, "reset_password", hash, time.Now().Add(time.Hour)); err != nil {
		return
	}
	link := s.appBaseURL + "/reset-password?token=" + raw
	if err := s.mailer.Send(ctx, u.Email, "Đặt lại mật khẩu Canopy", resetPasswordHTML(u.FullName, link)); err != nil {
		slog.Warn("send reset email failed", "err", err)
	}
}

// ResetPassword consumes a reset token and sets a new password.
func (s *Service) ResetPassword(ctx context.Context, token, newPassword string) error {
	if len(newPassword) < 8 {
		return ErrInvalidInput
	}
	userID, err := s.repo.ConsumeEmailToken(ctx, "reset_password", HashToken(token))
	if err != nil {
		return ErrInvalidToken
	}
	hash, err := HashPassword(newPassword)
	if err != nil {
		return err
	}
	return s.repo.UpdatePassword(ctx, userID, hash)
}

func (s *Service) sendVerification(ctx context.Context, u *User) {
	raw, hash, err := NewRefreshToken()
	if err != nil {
		return
	}
	if err := s.repo.StoreEmailToken(ctx, u.ID, "verify_email", hash, time.Now().Add(24*time.Hour)); err != nil {
		slog.Warn("store verify token failed", "err", err)
		return
	}
	link := s.appBaseURL + "/verify-email?token=" + raw
	if err := s.mailer.Send(ctx, u.Email, "Xác minh email Canopy", verifyEmailHTML(u.FullName, link)); err != nil {
		slog.Warn("send verify email failed", "err", err, "email", u.Email)
	}
}

func emailLayout(heading, name, body, btnText, btnURL string) string {
	return fmt.Sprintf(`<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f1b14">
  <div style="font-size:20px;font-weight:800;color:#16a34a;margin-bottom:16px">🌿 Canopy</div>
  <h1 style="font-size:20px;margin:0 0 8px">%s</h1>
  <p style="color:#4b5a51;font-size:14px;line-height:1.6">Chào %s,</p>
  <p style="color:#4b5a51;font-size:14px;line-height:1.6">%s</p>
  <a href="%s" style="display:inline-block;margin:16px 0;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600">%s</a>
  <p style="color:#7a8a80;font-size:12px;line-height:1.6">Nếu nút không hoạt động, dán liên kết này vào trình duyệt:<br>%s</p>
  <p style="color:#7a8a80;font-size:12px;margin-top:24px">— Đội ngũ Canopy</p>
</div>`, heading, name, body, btnURL, btnText, btnURL)
}

func verifyEmailHTML(name, link string) string {
	return emailLayout("Xác minh email của bạn", name,
		"Cảm ơn bạn đã đăng ký Canopy. Bấm nút bên dưới để xác minh email và kích hoạt tài khoản. Liên kết hết hạn sau 24 giờ.",
		"Xác minh email", link)
}

func resetPasswordHTML(name, link string) string {
	return emailLayout("Đặt lại mật khẩu", name,
		"Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Bấm nút bên dưới để tạo mật khẩu mới. Liên kết hết hạn sau 1 giờ. Bỏ qua email này nếu không phải bạn.",
		"Đặt lại mật khẩu", link)
}

func (s *Service) issue(ctx context.Context, u *User) (*Tokens, error) {
	access, err := s.tm.IssueAccess(u.ID, u.IsSystemAdmin)
	if err != nil {
		return nil, err
	}
	raw, hash, err := NewRefreshToken()
	if err != nil {
		return nil, err
	}
	if err := s.repo.StoreRefresh(ctx, u.ID, hash, time.Now().Add(s.tm.RefreshTTL())); err != nil {
		return nil, err
	}
	return &Tokens{
		AccessToken:  access,
		RefreshToken: raw,
		ExpiresIn:    int(s.tm.AccessTTL().Seconds()),
	}, nil
}

// Bootstrap creates the first system admin from env seed if none exists.
func (s *Service) Bootstrap(ctx context.Context, email, password string) error {
	if strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" {
		return nil
	}
	n, err := s.repo.CountAdmins(ctx)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	hash, err := HashPassword(password)
	if err != nil {
		return err
	}
	id, err := s.repo.CreateAdmin(ctx, strings.TrimSpace(email), hash, "System Admin")
	if err != nil {
		return err
	}
	slog.Info("bootstrapped system admin", "email", email, "user_id", id)
	return nil
}
