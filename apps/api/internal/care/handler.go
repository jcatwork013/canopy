package care

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/canopy/api/internal/ai"
	"github.com/canopy/api/internal/auth"
	"github.com/canopy/api/internal/respond"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Generator produces a roadmap from context (satisfied by *ai.Service).
type Generator interface {
	GenerateCareRoadmap(ctx context.Context, in ai.CareRoadmapInput) (*ai.CareRoadmap, error)
}

type Handler struct {
	repo *Repo
	gen  Generator
}

func NewHandler(repo *Repo, gen Generator) *Handler {
	return &Handler{repo: repo, gen: gen}
}

// Register mounts /care routes (caller wraps with auth.Required).
func (h *Handler) Register(g *gin.RouterGroup) {
	g.GET("/plans", h.list)
	g.POST("/plans", h.generate)
	g.GET("/plans/:id", h.get)
	g.PATCH("/plans/:id", h.setStatus)
	g.DELETE("/plans/:id", h.remove)
	g.PATCH("/plans/:id/steps/:stepId", h.toggleStep)
}

func (h *Handler) list(c *gin.Context) {
	plans, err := h.repo.List(c.Request.Context(), auth.UserID(c))
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không tải được phác đồ")
		return
	}
	c.JSON(http.StatusOK, plans)
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

func (h *Handler) generate(c *gin.Context) {
	var req struct {
		PlantName   string `json:"plant_name"`
		Source      string `json:"source"`
		HealthHint  string `json:"health_hint"`
		Context     string `json:"context"`
		CoverURL    string `json:"cover_url"`
		UserPlantID string `json:"user_plant_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "dữ liệu không hợp lệ")
		return
	}

	rm, err := h.gen.GenerateCareRoadmap(c.Request.Context(), ai.CareRoadmapInput{
		PlantName:  req.PlantName,
		Source:     req.Source,
		HealthHint: normalizeHealth(req.HealthHint),
		Context:    req.Context,
	})
	if err != nil {
		// Mirror the AI handler: use 4xx so CDN proxies don't mangle CORS headers.
		code := respond.CodeInternal
		if errors.Is(err, ai.ErrNotConfigured) {
			code = respond.CodeSystemNotReady
		}
		respond.Fail(c, http.StatusUnprocessableEntity, code, err.Error())
		return
	}

	plan := mapRoadmap(auth.UserID(c), rm, req.PlantName, normalizeHealth(req.HealthHint), nz(req.CoverURL))
	if pid, err := uuid.Parse(req.UserPlantID); err == nil {
		plan.UserPlantID = &pid
	}

	saved, err := h.repo.Create(c.Request.Context(), plan)
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không lưu được phác đồ")
		return
	}
	c.JSON(http.StatusCreated, saved)
}

func (h *Handler) setStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "id không hợp lệ")
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || !validStatus(req.Status) {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "trạng thái không hợp lệ")
		return
	}
	p, err := h.repo.SetStatus(c.Request.Context(), auth.UserID(c), id, req.Status)
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

func (h *Handler) toggleStep(c *gin.Context) {
	planID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "id không hợp lệ")
		return
	}
	stepID, err := uuid.Parse(c.Param("stepId"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "stepId không hợp lệ")
		return
	}
	var req struct {
		Done bool `json:"done"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "dữ liệu không hợp lệ")
		return
	}
	s, err := h.repo.ToggleStep(c.Request.Context(), auth.UserID(c), planID, stepID, req.Done)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, s)
}

// --- helpers ---------------------------------------------------------------

func mapRoadmap(userID uuid.UUID, rm *ai.CareRoadmap, fallbackName, healthHint string, cover *string) *Plan {
	title := strings.TrimSpace(rm.Title)
	if title == "" {
		title = "Phác đồ chăm sóc"
	}
	name := strings.TrimSpace(rm.PlantName)
	if name == "" {
		name = strings.TrimSpace(fallbackName)
	}
	health := normalizeHealth(rm.Health)
	if health == "" {
		health = healthHint
	}
	if health == "" {
		health = "ok"
	}

	p := &Plan{
		UserID:       userID,
		Title:        title,
		Health:       health,
		Summary:      rm.Summary,
		Watering:     nz(rm.Watering),
		Fertilizer:   nz(rm.Fertilizer),
		Light:        nz(rm.Light),
		Prevention:   nz(rm.Prevention),
		WarningSigns: rm.WarningSigns,
		DurationDays: rm.DurationDays,
		CoverURL:     cover,
		PlantName:    nz(name),
	}
	if p.WarningSigns == nil {
		p.WarningSigns = []string{}
	}
	for _, s := range rm.Steps {
		p.Steps = append(p.Steps, Step{
			DayOffset:   s.DayOffset,
			Title:       s.Title,
			Description: s.Description,
			Category:    normalizeCategory(s.Category),
			Amount:      nz(s.Amount),
		})
	}
	return p
}

func normalizeHealth(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "ok", "warning", "disease":
		return strings.ToLower(strings.TrimSpace(s))
	default:
		return ""
	}
}

func normalizeCategory(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "water", "fertilize", "light", "soil", "prune", "monitor", "treat":
		return strings.ToLower(strings.TrimSpace(s))
	default:
		return "other"
	}
}

func validStatus(s string) bool {
	return s == "active" || s == "completed" || s == "abandoned"
}

func nz(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func respondErr(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		respond.Fail(c, http.StatusNotFound, respond.CodeNotFound, "không tìm thấy phác đồ")
		return
	}
	respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "có lỗi xảy ra")
}
