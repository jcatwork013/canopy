package httpx

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/canopy/api/internal/respond"
	"github.com/canopy/api/internal/system"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const requestIDHeader = "X-Request-ID"
const ctxRequestID = "request_id"

// RequestID assigns/propagates a request id for tracing and log correlation.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(requestIDHeader)
		if id == "" {
			id = uuid.NewString()
		}
		c.Set(ctxRequestID, id)
		c.Writer.Header().Set(requestIDHeader, id)
		c.Next()
	}
}

// RequestLogger emits one structured line per request. Never logs secrets.
func RequestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		logger.Info("http_request",
			"request_id", c.GetString(ctxRequestID),
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"ip", c.ClientIP(),
		)
	}
}

// Recovery converts panics into a standardized 500 instead of crashing.
func Recovery(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				logger.Error("panic_recovered",
					"request_id", c.GetString(ctxRequestID),
					"panic", r,
					"path", c.Request.URL.Path,
				)
				respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "internal server error")
			}
		}()
		c.Next()
	}
}

// ReadinessGate blocks business routes while the system is not configured.
//
// Allowlisted prefixes (system status, admin setup, admin auth) always pass so an
// admin can complete first-run configuration. Everything else returns 503
// SYSTEM_NOT_READY until ReadinessService reports ready.
func ReadinessGate(rs *system.Readiness, allowPrefixes []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		for _, p := range allowPrefixes {
			if hasPrefix(path, p) {
				c.Next()
				return
			}
		}
		if !rs.Snapshot(c.Request.Context()).Ready {
			respond.Fail(c, http.StatusServiceUnavailable, respond.CodeSystemNotReady,
				"system is not configured yet; please try again later")
			return
		}
		c.Next()
	}
}

func hasPrefix(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
