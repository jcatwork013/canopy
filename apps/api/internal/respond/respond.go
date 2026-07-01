// Package respond holds the standardized HTTP response helpers + error codes,
// shared by every handler and middleware (kept separate to avoid import cycles).
package respond

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Stable error codes — clients switch on these.
const (
	CodeSystemNotReady = "SYSTEM_NOT_READY"
	CodeUnauthorized   = "UNAUTHORIZED"
	CodeForbidden      = "FORBIDDEN"
	CodeNotFound       = "NOT_FOUND"
	CodeValidation     = "VALIDATION_ERROR"
	CodeRateLimited    = "RATE_LIMITED"
	CodeConflict       = "CONFLICT"
	CodeInternal       = "INTERNAL_ERROR"
)

type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

func JSON(c *gin.Context, status int, payload any) { c.JSON(status, payload) }

func Fail(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, ErrorBody{Error: ErrorDetail{Code: code, Message: message}})
}

func FailWithDetails(c *gin.Context, status int, code, message string, details any) {
	c.AbortWithStatusJSON(status, ErrorBody{Error: ErrorDetail{Code: code, Message: message, Details: details}})
}

func NotFoundHandler(c *gin.Context) {
	Fail(c, http.StatusNotFound, CodeNotFound, "resource not found")
}
