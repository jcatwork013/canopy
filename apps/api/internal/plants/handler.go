package plants

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

// Register mounts /plants routes (caller wraps with auth.Required).
func (h *Handler) Register(g *gin.RouterGroup) {
	g.GET("", h.list)
	g.POST("", h.create)
	g.GET("/:id", h.get)
	g.PATCH("/:id", h.rename)
	g.DELETE("/:id", h.remove)
	g.POST("/:id/checkins", h.addCheckIn)
}

// checkInReq is the wire shape of a check-in (mirrors web journal.ts CheckIn).
type checkInReq struct {
	Mode    string          `json:"mode"`
	Health  string          `json:"health"`
	Title   string          `json:"title"`
	Summary string          `json:"summary"`
	Note    *string         `json:"note"`
	Thumb   *string         `json:"thumb"`
	Result  json.RawMessage `json:"result"`
}

func (r checkInReq) toModel() CheckIn {
	return CheckIn{
		Mode:    normMode(r.Mode),
		Health:  normHealth(r.Health),
		Title:   strings.TrimSpace(r.Title),
		Summary: strings.TrimSpace(r.Summary),
		Note:    nz(r.Note),
		Thumb:   nz(r.Thumb),
		Result:  r.Result,
	}
}

func (h *Handler) list(c *gin.Context) {
	list, err := h.repo.List(c.Request.Context(), auth.UserID(c))
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không tải được khu vườn")
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "id không hợp lệ")
		return
	}
	p, err := h.repo.Get(c.Request.Context(), auth.UserID(c), id)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) create(c *gin.Context) {
	var req struct {
		Name    string     `json:"name"`
		Species *string    `json:"species"`
		Cover   *string    `json:"cover"`
		CheckIn checkInReq `json:"check_in"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "dữ liệu không hợp lệ")
		return
	}
	p, err := h.repo.Create(c.Request.Context(), auth.UserID(c),
		strings.TrimSpace(req.Name), nz(req.Species), nz(req.Cover), req.CheckIn.toModel())
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không lưu được cây")
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) addCheckIn(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "id không hợp lệ")
		return
	}
	var req checkInReq
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "dữ liệu không hợp lệ")
		return
	}
	p, err := h.repo.AddCheckIn(c.Request.Context(), auth.UserID(c), id, req.toModel())
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) rename(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "id không hợp lệ")
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "tên không hợp lệ")
		return
	}
	p, err := h.repo.Rename(c.Request.Context(), auth.UserID(c), id, strings.TrimSpace(req.Name))
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) remove(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "id không hợp lệ")
		return
	}
	if err := h.repo.Delete(c.Request.Context(), auth.UserID(c), id); err != nil {
		respondErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- helpers ---------------------------------------------------------------

func respondErr(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		respond.Fail(c, http.StatusNotFound, respond.CodeNotFound, "không tìm thấy cây")
		return
	}
	respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "có lỗi xảy ra")
}

func nz(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}

func normMode(s string) string {
	if strings.ToLower(strings.TrimSpace(s)) == "diagnose" {
		return "diagnose"
	}
	return "identify"
}

func normHealth(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "ok", "warning", "disease":
		return strings.ToLower(strings.TrimSpace(s))
	default:
		return "unknown"
	}
}
