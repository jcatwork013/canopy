package ai

import (
	"encoding/base64"
	"errors"
	"net/http"
	"strings"

	"github.com/canopy/api/internal/respond"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Register mounts /ai routes (caller wraps with auth.Required).
func (h *Handler) Register(g *gin.RouterGroup) {
	g.POST("/identify", h.identify)
	g.POST("/diagnose", h.diagnose)
	g.POST("/chat", h.chat)
}

func (h *Handler) chat(c *gin.Context) {
	var req struct {
		Messages    []ChatMessage `json:"messages"`
		ImageBase64 string        `json:"image_base64"`
		MimeType    string        `json:"mime_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Messages) == 0 {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "cần nội dung tin nhắn")
		return
	}
	var img *Image
	if req.ImageBase64 != "" {
		if d, ok := decode(req.ImageBase64, req.MimeType); ok {
			img = &d
		}
	}
	reply, model, err := h.svc.Chat(c.Request.Context(), req.Messages, img)
	if err != nil {
		respondAIErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"reply": reply, "model": model})
}

func decode(b64, mime string) (Image, bool) {
	b64 = stripDataURL(b64)
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil || len(data) == 0 {
		return Image{}, false
	}
	if mime == "" {
		mime = "image/jpeg"
	}
	return Image{Mime: mime, Data: data}, true
}

// stripDataURL drops a leading "data:image/...;base64," prefix if present.
func stripDataURL(s string) string {
	if i := strings.Index(s, ","); strings.HasPrefix(s, "data:") && i >= 0 {
		return s[i+1:]
	}
	return s
}

func (h *Handler) identify(c *gin.Context) {
	var req struct {
		ImageBase64 string `json:"image_base64"`
		MimeType    string `json:"mime_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid body")
		return
	}
	img, ok := decode(req.ImageBase64, req.MimeType)
	if !ok {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "ảnh không hợp lệ")
		return
	}
	res, err := h.svc.Identify(c.Request.Context(), img)
	if err != nil {
		respondAIErr(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) diagnose(c *gin.Context) {
	var req struct {
		ImagesBase64 []string `json:"images_base64"`
		MimeType     string   `json:"mime_type"`
		SymptomsText string   `json:"symptoms_text"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "invalid body")
		return
	}
	var imgs []Image
	for _, b := range req.ImagesBase64 {
		if img, ok := decode(b, req.MimeType); ok {
			imgs = append(imgs, img)
		}
	}
	if len(imgs) == 0 {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "cần ít nhất một ảnh hợp lệ")
		return
	}
	res, err := h.svc.Diagnose(c.Request.Context(), imgs, req.SymptomsText)
	if err != nil {
		respondAIErr(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func respondAIErr(c *gin.Context, err error) {
	// Use 4xx (not 5xx) on purpose: edge proxies/CDN (Cloudflare) replace origin
	// 5xx responses with their own error page, which strips our CORS headers and
	// surfaces in the browser as a misleading "CORS policy" error.
	code := respond.CodeInternal
	if errors.Is(err, ErrNotConfigured) {
		code = respond.CodeSystemNotReady
	}
	respond.Fail(c, http.StatusUnprocessableEntity, code, err.Error())
}
