package scans

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/canopy/api/internal/auth"
	"github.com/canopy/api/internal/respond"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct{ repo *Repo }

func NewHandler(repo *Repo) *Handler { return &Handler{repo: repo} }

// Register mounts /scans routes (caller wraps with auth.Required).
func (h *Handler) Register(g *gin.RouterGroup) {
	g.GET("", h.list)
	g.POST("", h.add)
	g.DELETE("/:id", h.remove)
}

func (h *Handler) list(c *gin.Context) {
	items, err := h.repo.List(c.Request.Context(), auth.UserID(c))
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không tải được lịch sử")
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) add(c *gin.Context) {
	var req struct {
		Mode   string          `json:"mode"`
		Title  string          `json:"title"`
		Thumb  *string         `json:"thumb"`
		Result json.RawMessage `json:"result"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Title) == "" {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "dữ liệu không hợp lệ")
		return
	}
	mode := "identify"
	if strings.ToLower(strings.TrimSpace(req.Mode)) == "diagnose" {
		mode = "diagnose"
	}
	var thumb *string
	if req.Thumb != nil && strings.TrimSpace(*req.Thumb) != "" {
		thumb = req.Thumb
	}
	it, err := h.repo.Add(c.Request.Context(), auth.UserID(c), Item{
		Mode: mode, Title: strings.TrimSpace(req.Title), Thumb: thumb, Result: req.Result,
	})
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không lưu được lịch sử")
		return
	}
	c.JSON(http.StatusCreated, it)
}

func (h *Handler) remove(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "id không hợp lệ")
		return
	}
	if err := h.repo.Delete(c.Request.Context(), auth.UserID(c), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			respond.Fail(c, http.StatusNotFound, respond.CodeNotFound, "không tìm thấy")
			return
		}
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "có lỗi xảy ra")
		return
	}
	c.Status(http.StatusNoContent)
}
