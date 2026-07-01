package system

import (
	"context"
	"net/http"

	"github.com/canopy/api/internal/config"
	"github.com/canopy/api/internal/content"
	"github.com/canopy/api/internal/sysconfig"
	"github.com/gin-gonic/gin"
)

func versionString() string { return config.Version }

// SiteSource provides the public website settings (satisfied by sysconfig.Service).
type SiteSource interface {
	SiteConfig(ctx context.Context) sysconfig.SiteConfig
}

// ArticlesSource provides aggregated guide articles (satisfied by content.Service).
type ArticlesSource interface {
	Articles(ctx context.Context) []content.Article
}

// Handler exposes the public system endpoints.
type Handler struct {
	readiness *Readiness
	site      SiteSource
	articles  ArticlesSource
}

func NewHandler(readiness *Readiness, site SiteSource, articles ArticlesSource) *Handler {
	return &Handler{readiness: readiness, site: site, articles: articles}
}

// Register mounts routes under the given group (expected: /api/v1/system).
func (h *Handler) Register(g *gin.RouterGroup) {
	g.GET("/status", h.status)
	g.GET("/health", h.health)
	g.GET("/site", h.siteConfig)
	g.GET("/guides", h.guides)
}

// guides returns aggregated public gardening articles (cẩm nang cây).
func (h *Handler) guides(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"articles": h.articles.Articles(c.Request.Context())})
}

// siteConfig returns the admin-editable public website settings (anonymous).
func (h *Handler) siteConfig(c *gin.Context) {
	c.JSON(http.StatusOK, h.site.SiteConfig(c.Request.Context()))
}

// status returns the readiness snapshot. Public, no auth — the frontend calls it
// before anything else to decide between the app, the "setting up" screen, or the
// admin setup wizard.
func (h *Handler) status(c *gin.Context) {
	s := h.readiness.Snapshot(c.Request.Context())
	code := http.StatusOK
	if !s.Ready {
		// Still 200: status is informational. The ReadinessGate middleware is
		// what returns 503 on business routes.
		code = http.StatusOK
	}
	c.JSON(code, s)
}

// health is a liveness probe (process is up). Distinct from readiness.
func (h *Handler) health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "version": versionString()})
}
