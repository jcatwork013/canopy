package auth

import (
	"net/http"
	"strings"

	"github.com/canopy/api/internal/respond"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	ctxUserID  = "auth_user_id"
	ctxIsAdmin = "auth_is_admin"
)

// Middleware builds gin guards from a TokenManager.
type Middleware struct {
	tm *TokenManager
}

func NewMiddleware(tm *TokenManager) *Middleware { return &Middleware{tm: tm} }

// Required validates the Bearer access token and stores identity in context.
func (m *Middleware) Required() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearer(c)
		if token == "" {
			respond.Fail(c, http.StatusUnauthorized, respond.CodeUnauthorized, "missing bearer token")
			return
		}
		claims, err := m.tm.VerifyAccess(token)
		if err != nil {
			respond.Fail(c, http.StatusUnauthorized, respond.CodeUnauthorized, "invalid or expired token")
			return
		}
		uid, err := uuid.Parse(claims.Subject)
		if err != nil {
			respond.Fail(c, http.StatusUnauthorized, respond.CodeUnauthorized, "invalid token subject")
			return
		}
		c.Set(ctxUserID, uid)
		c.Set(ctxIsAdmin, claims.IsSystemAdmin)
		c.Next()
	}
}

// AdminRequired must run after Required(); it enforces the system_admin role.
func (m *Middleware) AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !c.GetBool(ctxIsAdmin) {
			respond.Fail(c, http.StatusForbidden, respond.CodeForbidden, "system admin only")
			return
		}
		c.Next()
	}
}

// UserID returns the authenticated user id from context.
func UserID(c *gin.Context) uuid.UUID {
	if v, ok := c.Get(ctxUserID); ok {
		if id, ok := v.(uuid.UUID); ok {
			return id
		}
	}
	return uuid.Nil
}

func bearer(c *gin.Context) string {
	h := c.GetHeader("Authorization")
	if after, found := strings.CutPrefix(h, "Bearer "); found {
		return strings.TrimSpace(after)
	}
	return ""
}
