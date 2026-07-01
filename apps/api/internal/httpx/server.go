package httpx

import (
	"log/slog"
	"net/http"

	"github.com/canopy/api/internal/admin"
	"github.com/canopy/api/internal/ai"
	"github.com/canopy/api/internal/auth"
	"github.com/canopy/api/internal/care"
	"github.com/canopy/api/internal/config"
	"github.com/canopy/api/internal/content"
	"github.com/canopy/api/internal/kyc"
	"github.com/canopy/api/internal/respond"
	"github.com/canopy/api/internal/sysconfig"
	"github.com/canopy/api/internal/system"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Deps are the server's collaborators, injected from main.
type Deps struct {
	Config       *config.Config
	Logger       *slog.Logger
	DB           *pgxpool.Pool
	Readiness    *system.Readiness
	AuthHandler  *auth.Handler
	AuthMW       *auth.Middleware
	AdminHandler *admin.Handler
	AIHandler    *ai.Handler
	CareHandler  *care.Handler
	KYCHandler   *kyc.Handler
	Sysconfig    *sysconfig.Service
	Content      *content.Service
}

// Server holds the configured gin engine.
type Server struct {
	deps   Deps
	engine *gin.Engine
}

// NewServer builds the engine, global middleware, and registers all routes.
func NewServer(deps Deps) *Server {
	if deps.Config.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()
	engine.NoRoute(respond.NotFoundHandler)

	engine.Use(
		RequestID(),
		RequestLogger(deps.Logger),
		Recovery(deps.Logger),
		CORS(deps.Config.CORSAllowedOrigins),
	)

	s := &Server{deps: deps, engine: engine}
	s.routes()
	return s
}

func (s *Server) Handler() http.Handler { return s.engine }

func (s *Server) routes() {
	v1 := s.engine.Group("/api/v1")

	// Routes that must work even before the system is "ready" (so an admin can
	// authenticate and finish configuration).
	gateAllowlist := []string{
		"/api/v1/system",
		"/api/v1/auth",
		"/api/v1/admin",
		// AI only needs its own provider configured, not full readiness.
		"/api/v1/ai",
	}
	v1.Use(ReadinessGate(s.deps.Readiness, gateAllowlist))

	// system (public)
	system.NewHandler(s.deps.Readiness, s.deps.Sysconfig, s.deps.Content).Register(v1.Group("/system"))

	// auth (public login/refresh; /me guarded internally)
	s.deps.AuthHandler.Register(v1.Group("/auth"))

	// admin (system_admin only)
	adminGrp := v1.Group("/admin")
	adminGrp.Use(s.deps.AuthMW.Required(), s.deps.AuthMW.AdminRequired())
	s.deps.AdminHandler.Register(adminGrp)
	s.deps.KYCHandler.RegisterAdmin(adminGrp) // /admin/kyc...

	// ai (auth required) — plant identification & disease diagnosis.
	aiGrp := v1.Group("/ai")
	aiGrp.Use(s.deps.AuthMW.Required())
	s.deps.AIHandler.Register(aiGrp)

	// care (auth required) — AI-generated care roadmaps (phác đồ chăm sóc).
	careGrp := v1.Group("/care")
	careGrp.Use(s.deps.AuthMW.Required())
	s.deps.CareHandler.Register(careGrp)

	// kyc (auth required) — identity verification + role applications.
	kycGrp := v1.Group("/kyc")
	kycGrp.Use(s.deps.AuthMW.Required())
	s.deps.KYCHandler.RegisterUser(kycGrp)

	// Phase 2+: plants, marketplace register here behind AuthMW.Required().
}
