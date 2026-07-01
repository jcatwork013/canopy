package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type User struct {
	ID              uuid.UUID
	Email           string
	PasswordHash    string
	FullName        string
	IsPlayer        bool
	IsSeller        bool
	IsCaretaker     bool
	IsSystemAdmin   bool
	AccountStatus   string
	EmailVerifiedAt *time.Time
	KycStatus       string
	CreatedAt       time.Time
}

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

const userCols = `id, email, password_hash, full_name, is_player, is_seller, is_caretaker,
	is_system_admin, account_status, email_verified_at, kyc_status, created_at`

func scanUser(row pgx.Row) (*User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.IsPlayer, &u.IsSeller,
		&u.IsCaretaker, &u.IsSystemAdmin, &u.AccountStatus, &u.EmailVerifiedAt, &u.KycStatus, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *Repo) GetByEmail(ctx context.Context, email string) (*User, error) {
	return scanUser(r.db.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE email=$1 AND deleted_at IS NULL`, email))
}

func (r *Repo) GetByID(ctx context.Context, id uuid.UUID) (*User, error) {
	return scanUser(r.db.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE id=$1 AND deleted_at IS NULL`, id))
}

// ListUsers returns recent users (admin user-management / verification).
func (r *Repo) ListUsers(ctx context.Context, limit int) ([]User, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+userCols+` FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.IsPlayer, &u.IsSeller,
			&u.IsCaretaker, &u.IsSystemAdmin, &u.AccountStatus, &u.EmailVerifiedAt, &u.KycStatus, &u.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// SetUserAccess updates a user's seller/caretaker grant and (optionally) marks
// KYC verified. kyc=false leaves the current KYC status untouched.
func (r *Repo) SetUserAccess(ctx context.Context, id uuid.UUID, kyc, seller, caretaker bool) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET is_seller=$2, is_caretaker=$3,
		   kyc_status = CASE WHEN $4 THEN 'verified'::kyc_status ELSE kyc_status END
		 WHERE id=$1`,
		id, seller, caretaker, kyc)
	return err
}

func (r *Repo) CountAdmins(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRow(ctx,
		`SELECT count(*) FROM users WHERE is_system_admin AND deleted_at IS NULL`).Scan(&n)
	return n, err
}

// CreateAdmin inserts an active, email-verified system admin (bootstrap only).
func (r *Repo) CreateAdmin(ctx context.Context, email, passwordHash, fullName string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, full_name, is_system_admin, account_status, email_verified_at)
		 VALUES ($1,$2,$3,true,'active', now()) RETURNING id`,
		email, passwordHash, fullName).Scan(&id)
	return id, err
}

// CreateUser inserts a self-registered user: active (so they can sign in) but
// email-unverified (a banner nudges them; sensitive actions gate on it).
func (r *Repo) CreateUser(ctx context.Context, email, passwordHash, fullName, phone string) (*User, error) {
	var phonePtr *string
	if phone != "" {
		phonePtr = &phone
	}
	return scanUser(r.db.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, full_name, phone, account_status)
		 VALUES ($1,$2,$3,$4,'active')
		 RETURNING `+userCols,
		email, passwordHash, fullName, phonePtr))
}

func (r *Repo) EmailExists(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE email=$1 AND deleted_at IS NULL)`, email).Scan(&exists)
	return exists, err
}

func (r *Repo) SetEmailVerified(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET email_verified_at = now() WHERE id=$1`, userID)
	return err
}

func (r *Repo) UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET password_hash=$1 WHERE id=$2`, passwordHash, userID)
	return err
}

// --- email tokens (verify_email | reset_password) ---

func (r *Repo) StoreEmailToken(ctx context.Context, userID uuid.UUID, purpose, tokenHash string, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at) VALUES ($1,$2,$3,$4)`,
		userID, purpose, tokenHash, expiresAt)
	return err
}

// ConsumeEmailToken validates an unused, unexpired token of the given purpose,
// marks it used, and returns its user id.
func (r *Repo) ConsumeEmailToken(ctx context.Context, purpose, tokenHash string) (uuid.UUID, error) {
	var userID uuid.UUID
	err := r.db.QueryRow(ctx,
		`UPDATE email_tokens SET used_at = now()
		   WHERE token_hash=$1 AND purpose=$2 AND used_at IS NULL AND expires_at > now()
		   RETURNING user_id`,
		tokenHash, purpose).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	return userID, err
}

// --- refresh tokens ---

func (r *Repo) StoreRefresh(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
		userID, tokenHash, expiresAt)
	return err
}

// ConsumeRefresh validates an unrevoked, unexpired refresh token and returns its
// user id. It does NOT delete it (rotation revokes explicitly).
func (r *Repo) FindRefresh(ctx context.Context, tokenHash string) (uuid.UUID, error) {
	var userID uuid.UUID
	err := r.db.QueryRow(ctx,
		`SELECT user_id FROM refresh_tokens
		   WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > now()`,
		tokenHash).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	return userID, err
}

func (r *Repo) RevokeRefresh(ctx context.Context, tokenHash string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL`,
		tokenHash)
	return err
}
