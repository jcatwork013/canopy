package admin

import (
	"context"
	"net/http"
	"strings"

	"github.com/canopy/api/internal/auth"
	"github.com/canopy/api/internal/respond"
	"github.com/canopy/api/internal/sysconfig"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// StorageChecker mirrors storage.Client.BucketReachable.
type StorageChecker interface {
	BucketReachable(ctx context.Context) error
}

type Handler struct {
	cfg     *sysconfig.Service
	storage StorageChecker
	tester  *Tester
	users   *auth.Repo
}

func NewHandler(cfg *sysconfig.Service, storage StorageChecker, tester *Tester, users *auth.Repo) *Handler {
	return &Handler{cfg: cfg, storage: storage, tester: tester, users: users}
}

// Register mounts /admin routes. The caller wraps the group with auth.Required +
// auth.AdminRequired (and the gate allowlists /admin/setup paths).
func (h *Handler) Register(g *gin.RouterGroup) {
	g.GET("/config", h.getConfig)
	g.PUT("/config", h.putConfig)
	g.POST("/config/test", h.testConfig)
	// Separate subtree (not /ai-providers/*) to avoid a static-vs-:id route conflict.
	g.POST("/ai/verify", h.verifyAI)
	g.GET("/users", h.listUsers)
	g.POST("/users/:id/verify", h.verifyUser)
	g.GET("/ai-providers", h.listProviders)
	g.POST("/ai-providers", h.createProvider)
	g.PUT("/ai-providers/:id", h.updateProvider)
	g.POST("/ai-providers/:id/default", h.setDefaultProvider)
}

func mask(secret string) string {
	if secret == "" {
		return ""
	}
	if len(secret) <= 4 {
		return "••••"
	}
	return "••••••••" + secret[len(secret)-4:]
}

// --- config ---

func (h *Handler) getConfig(c *gin.Context) {
	ctx := c.Request.Context()
	c.JSON(http.StatusOK, gin.H{
		"email": gin.H{
			"resend_api_key": gin.H{"set": h.cfg.ResendAPIKey(ctx) != "", "masked": mask(h.cfg.ResendAPIKey(ctx))},
			"resend_from":    h.cfg.ResendFrom(ctx),
		},
		"storage":   gin.H{"reachable": h.storage.BucketReachable(ctx) == nil},
		"providers": h.maskedProviders(ctx),
	})
}

func (h *Handler) putConfig(c *gin.Context) {
	var req struct {
		Values map[string]string `json:"values"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Values) == 0 {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "values required")
		return
	}
	uid := auth.UserID(c)
	for k, v := range req.Values {
		if strings.TrimSpace(v) == "" {
			continue // never overwrite a secret with an empty value
		}
		if err := h.cfg.SetConfig(c.Request.Context(), k, v, uid); err != nil {
			respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "failed to save config")
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) testConfig(c *gin.Context) {
	var req struct {
		Target     string `json:"target"`   // 'ai' | 'email' | 'storage'
		Provider   string `json:"provider"` // 'gemini' | 'openai' (ai only)
		APIKey     string `json:"api_key"`
		ProviderID string `json:"provider_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid body")
		return
	}
	ctx := c.Request.Context()
	var err error
	switch req.Target {
	case "ai":
		key := strings.TrimSpace(req.APIKey)
		provider := strings.TrimSpace(req.Provider)
		if key == "" {
			if p, ok := h.cfg.DefaultProvider(ctx); ok {
				key = p.APIKey
				if provider == "" {
					provider = p.Type
				}
			}
		}
		err = h.tester.TestAI(ctx, provider, key)
	case "email":
		key := strings.TrimSpace(req.APIKey)
		if key == "" {
			key = h.cfg.ResendAPIKey(ctx)
		}
		err = h.tester.TestResend(ctx, key)
	case "storage":
		err = h.storage.BucketReachable(ctx)
	default:
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "unknown target")
		return
	}

	if err != nil {
		c.JSON(http.StatusOK, gin.H{"ok": false, "detail": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// verifyAI validates an AI key and, on success, returns the chat-capable models
// it can access so the admin UI can offer a model picker / "best model" pick.
// Falls back to the stored default provider's key when none is supplied.
func (h *Handler) verifyAI(c *gin.Context) {
	var req struct {
		Provider string `json:"provider"` // 'gemini' | 'openai'
		APIKey   string `json:"api_key"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid body")
		return
	}
	ctx := c.Request.Context()
	key := strings.TrimSpace(req.APIKey)
	provider := strings.TrimSpace(req.Provider)
	if key == "" {
		if p, ok := h.cfg.DefaultProvider(ctx); ok {
			key = p.APIKey
			if provider == "" {
				provider = p.Type
			}
		}
	}
	if provider == "" {
		provider = "gemini"
	}
	models, err := h.tester.ListModels(ctx, provider, key)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"ok": false, "detail": err.Error(), "models": []string{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "models": models})
}

// --- users (verification / role grants) ---

func (h *Handler) listUsers(c *gin.Context) {
	users, err := h.users.ListUsers(c.Request.Context(), 100)
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "failed to list users")
		return
	}
	out := make([]gin.H, 0, len(users))
	for _, u := range users {
		out = append(out, gin.H{
			"id": u.ID.String(), "email": u.Email, "full_name": u.FullName,
			"is_seller": u.IsSeller, "is_caretaker": u.IsCaretaker, "is_system_admin": u.IsSystemAdmin,
			"account_status": u.AccountStatus, "kyc_status": u.KycStatus,
			"email_verified": u.EmailVerifiedAt != nil, "created_at": u.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"users": out})
}

func (h *Handler) verifyUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid id")
		return
	}
	var req struct {
		Kyc       bool `json:"kyc"`
		Seller    bool `json:"seller"`
		Caretaker bool `json:"caretaker"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid body")
		return
	}
	if err := h.users.SetUserAccess(c.Request.Context(), id, req.Kyc, req.Seller, req.Caretaker); err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "failed to update user")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- ai providers ---

func (h *Handler) maskedProviders(ctx context.Context) []gin.H {
	out := []gin.H{}
	for _, p := range h.cfg.Providers(ctx) {
		out = append(out, gin.H{
			"id": p.ID, "name": p.Name, "type": p.Type, "model": p.Model,
			"enabled": p.Enabled, "is_default": p.IsDefault,
			"key_set": p.APIKey != "", "key_masked": mask(p.APIKey),
		})
	}
	return out
}

func (h *Handler) listProviders(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"providers": h.maskedProviders(c.Request.Context())})
}

func (h *Handler) createProvider(c *gin.Context) {
	var req struct {
		Name    string `json:"name"`
		Type    string `json:"type"`
		APIKey  string `json:"api_key"`
		Model   string `json:"model"`
		Enabled bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" || req.Type == "" {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "name and type required")
		return
	}
	id, err := h.cfg.CreateProvider(c.Request.Context(), req.Name, req.Type, req.APIKey, req.Model, req.Enabled)
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "failed to create provider")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *Handler) updateProvider(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid id")
		return
	}
	var req struct {
		Model   string `json:"model"`
		Enabled bool   `json:"enabled"`
		APIKey  string `json:"api_key"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid body")
		return
	}
	if err := h.cfg.UpdateProvider(c.Request.Context(), id, req.Model, req.Enabled, req.APIKey); err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "failed to update provider")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) setDefaultProvider(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid id")
		return
	}
	if err := h.cfg.SetDefaultProvider(c.Request.Context(), id); err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "failed to set default")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
