package profile

import (
	"net/http"
	"strings"

	"github.com/canopy/api/internal/auth"
	"github.com/canopy/api/internal/respond"
	"github.com/gin-gonic/gin"
)

type Handler struct{ repo *Repo }

func NewHandler(repo *Repo) *Handler { return &Handler{repo: repo} }

// Register mounts /profile routes (caller wraps with auth.Required).
func (h *Handler) Register(g *gin.RouterGroup) {
	g.GET("", h.get)
	g.PUT("", h.update)
}

func (h *Handler) get(c *gin.Context) {
	p, err := h.repo.Get(c.Request.Context(), auth.UserID(c))
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không tải được hồ sơ")
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) update(c *gin.Context) {
	var req Prefs
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "dữ liệu không hợp lệ")
		return
	}
	p, err := h.repo.Update(c.Request.Context(), auth.UserID(c), Prefs{
		Name:   trimPtr(req.Name),
		Avatar: trimPtr(req.Avatar),
		Banner: trimPtr(req.Banner),
	})
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không lưu được hồ sơ")
		return
	}
	c.JSON(http.StatusOK, p)
}

// trimPtr nils out empty strings so blank fields don't overwrite stored values.
func trimPtr(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}
