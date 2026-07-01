package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/canopy/api/internal/respond"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
	mw  *Middleware
}

func NewHandler(svc *Service, mw *Middleware) *Handler {
	return &Handler{svc: svc, mw: mw}
}

// Register mounts /auth routes. login/refresh are allowlisted by the gate.
func (h *Handler) Register(g *gin.RouterGroup) {
	g.POST("/register", h.register)
	g.POST("/login", h.login)
	g.POST("/refresh", h.refresh)
	g.POST("/logout", h.logout)
	g.POST("/verify-email", h.verifyEmail)
	g.POST("/resend-verification", h.resendVerification)
	g.POST("/forgot-password", h.forgotPassword)
	g.POST("/reset-password", h.resetPassword)
	g.GET("/me", h.mw.Required(), h.me)
}

func (h *Handler) register(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
		Phone    string `json:"phone"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid request body")
		return
	}
	u, tokens, err := h.svc.Register(c.Request.Context(), req.Email, req.Password, req.FullName, req.Phone)
	if err != nil {
		switch {
		case errors.Is(err, ErrEmailTaken):
			respond.Fail(c, http.StatusConflict, respond.CodeConflict, "Email đã được đăng ký")
		case errors.Is(err, ErrInvalidInput):
			respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "Email, tên và mật khẩu (≥8 ký tự) là bắt buộc")
		default:
			respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "registration failed")
		}
		return
	}
	c.JSON(http.StatusCreated, gin.H{"user": toPublic(u), "tokens": tokens})
}

func (h *Handler) verifyEmail(c *gin.Context) {
	var req struct {
		Token string `json:"token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "token required")
		return
	}
	if err := h.svc.VerifyEmail(c.Request.Context(), req.Token); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "Liên kết không hợp lệ hoặc đã hết hạn")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) resendVerification(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	_ = c.ShouldBindJSON(&req)
	h.svc.ResendVerification(c.Request.Context(), req.Email)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) forgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	_ = c.ShouldBindJSON(&req)
	h.svc.ForgotPassword(c.Request.Context(), req.Email)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) resetPassword(c *gin.Context) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid request body")
		return
	}
	if err := h.svc.ResetPassword(c.Request.Context(), req.Token, req.Password); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "Liên kết không hợp lệ hoặc mật khẩu quá ngắn")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

type publicUser struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	FullName        string     `json:"full_name"`
	IsPlayer        bool       `json:"is_player"`
	IsSeller        bool       `json:"is_seller"`
	IsCaretaker     bool       `json:"is_caretaker"`
	IsSystemAdmin   bool       `json:"is_system_admin"`
	AccountStatus   string     `json:"account_status"`
	EmailVerifiedAt *time.Time `json:"email_verified_at"`
	KycStatus       string     `json:"kyc_status"`
	CreatedAt       time.Time  `json:"created_at"`
}

func toPublic(u *User) publicUser {
	return publicUser{
		ID: u.ID.String(), Email: u.Email, FullName: u.FullName,
		IsPlayer: u.IsPlayer, IsSeller: u.IsSeller, IsCaretaker: u.IsCaretaker,
		IsSystemAdmin: u.IsSystemAdmin, AccountStatus: u.AccountStatus,
		EmailVerifiedAt: u.EmailVerifiedAt, KycStatus: u.KycStatus, CreatedAt: u.CreatedAt,
	}
}

func (h *Handler) login(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid request body")
		return
	}
	u, tokens, err := h.svc.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) || errors.Is(err, ErrAccountInactive) {
			respond.Fail(c, http.StatusUnauthorized, respond.CodeUnauthorized, err.Error())
			return
		}
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "login failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toPublic(u), "tokens": tokens})
}

func (h *Handler) refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "refresh_token required")
		return
	}
	tokens, err := h.svc.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		respond.Fail(c, http.StatusUnauthorized, respond.CodeUnauthorized, "invalid refresh token")
		return
	}
	c.JSON(http.StatusOK, tokens)
}

func (h *Handler) logout(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.RefreshToken != "" {
		_ = h.svc.Logout(c.Request.Context(), req.RefreshToken)
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) me(c *gin.Context) {
	u, err := h.svc.Me(c.Request.Context(), UserID(c))
	if err != nil {
		respond.Fail(c, http.StatusNotFound, respond.CodeNotFound, "user not found")
		return
	}
	c.JSON(http.StatusOK, toPublic(u))
}
