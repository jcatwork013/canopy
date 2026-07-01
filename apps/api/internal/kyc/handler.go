package kyc

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/canopy/api/internal/auth"
	"github.com/canopy/api/internal/respond"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// maxDocBytes caps a single decoded document image (clients resize before upload).
const maxDocBytes = 6 << 20 // 6 MiB

// Storage is the subset of the object store the KYC flow needs.
type Storage interface {
	PutObject(ctx context.Context, key, contentType string, data []byte) error
	PresignGet(ctx context.Context, key string, expiry time.Duration) (string, error)
}

type Handler struct {
	repo  *Repo
	store Storage
}

func NewHandler(repo *Repo, store Storage) *Handler {
	return &Handler{repo: repo, store: store}
}

// RegisterUser mounts the applicant-facing /kyc routes (caller wraps with auth).
func (h *Handler) RegisterUser(g *gin.RouterGroup) {
	g.POST("", h.submit)
	g.GET("/me", h.me)
}

// RegisterAdmin mounts the reviewer routes under the admin group (admin-gated).
func (h *Handler) RegisterAdmin(g *gin.RouterGroup) {
	g.GET("/kyc", h.list)
	g.POST("/kyc/:id/approve", h.approve)
	g.POST("/kyc/:id/reject", h.reject)
}

var validDocTypes = map[string]bool{"national_id": true, "passport": true, "driver_license": true}

func (h *Handler) submit(c *gin.Context) {
	var req struct {
		DocumentType     string `json:"document_type"`
		DocumentNumber   string `json:"document_number"`
		RequestSeller    bool   `json:"request_seller"`
		RequestCaretaker bool   `json:"request_caretaker"`
		FrontBase64      string `json:"front_base64"`
		FrontMime        string `json:"front_mime"`
		BackBase64       string `json:"back_base64"`
		BackMime         string `json:"back_mime"`
		SelfieBase64     string `json:"selfie_base64"`
		SelfieMime       string `json:"selfie_mime"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "dữ liệu không hợp lệ")
		return
	}
	if !validDocTypes[req.DocumentType] {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "loại giấy tờ không hợp lệ")
		return
	}
	if !req.RequestSeller && !req.RequestCaretaker {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "chọn ít nhất một vai trò (bán hàng hoặc chăm sóc)")
		return
	}
	if strings.TrimSpace(req.FrontBase64) == "" {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "cần ảnh mặt trước giấy tờ")
		return
	}

	userID := auth.UserID(c)
	ctx := c.Request.Context()

	frontKey, err := h.upload(ctx, userID, "front", req.FrontBase64, req.FrontMime)
	if err != nil {
		respondUpload(c, err)
		return
	}
	sub := &Submission{
		UserID:             userID,
		DocumentType:       req.DocumentType,
		DocumentNumber:     nz(req.DocumentNumber),
		DocumentFrontKey:   frontKey,
		RequestedSeller:    req.RequestSeller,
		RequestedCaretaker: req.RequestCaretaker,
	}
	if strings.TrimSpace(req.BackBase64) != "" {
		k, err := h.upload(ctx, userID, "back", req.BackBase64, req.BackMime)
		if err != nil {
			respondUpload(c, err)
			return
		}
		sub.DocumentBackKey = &k
	}
	if strings.TrimSpace(req.SelfieBase64) != "" {
		k, err := h.upload(ctx, userID, "selfie", req.SelfieBase64, req.SelfieMime)
		if err != nil {
			respondUpload(c, err)
			return
		}
		sub.SelfieKey = &k
	}

	if _, err := h.repo.Create(ctx, sub); err != nil {
		if errors.Is(err, ErrPending) {
			respond.Fail(c, http.StatusConflict, respond.CodeConflict, ErrPending.Error())
			return
		}
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không lưu được hồ sơ")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "submitted"})
}

func (h *Handler) me(c *gin.Context) {
	s, err := h.repo.LatestByUser(c.Request.Context(), auth.UserID(c))
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusOK, gin.H{"status": "none", "requested_seller": false, "requested_caretaker": false})
		return
	}
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không tải được hồ sơ")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"status":              s.Status,
		"document_type":       s.DocumentType,
		"requested_seller":    s.RequestedSeller,
		"requested_caretaker": s.RequestedCaretaker,
		"rejection_reason":    s.RejectionReason,
		"created_at":          s.CreatedAt,
		"reviewed_at":         s.ReviewedAt,
	})
}

func (h *Handler) list(c *gin.Context) {
	subs, err := h.repo.List(c.Request.Context(), strings.TrimSpace(c.Query("status")))
	if err != nil {
		respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "không tải được danh sách")
		return
	}
	out := make([]gin.H, 0, len(subs))
	for _, s := range subs {
		out = append(out, gin.H{
			"id": s.ID.String(), "user_id": s.UserID.String(),
			"user_email": s.UserEmail, "user_full_name": s.UserFullName,
			"document_type": s.DocumentType, "document_number": s.DocumentNumber,
			"requested_seller": s.RequestedSeller, "requested_caretaker": s.RequestedCaretaker,
			"status": s.Status, "rejection_reason": s.RejectionReason, "created_at": s.CreatedAt,
			"front_url":  h.presign(c.Request.Context(), s.DocumentFrontKey),
			"back_url":   h.presignPtr(c.Request.Context(), s.DocumentBackKey),
			"selfie_url": h.presignPtr(c.Request.Context(), s.SelfieKey),
		})
	}
	c.JSON(http.StatusOK, gin.H{"submissions": out})
}

func (h *Handler) approve(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	if err := h.repo.Approve(c.Request.Context(), id, auth.UserID(c)); err != nil {
		respondReview(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) reject(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Reason) == "" {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "cần lý do từ chối")
		return
	}
	if err := h.repo.Reject(c.Request.Context(), id, auth.UserID(c), strings.TrimSpace(req.Reason)); err != nil {
		respondReview(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// --- helpers ---------------------------------------------------------------

func (h *Handler) upload(ctx context.Context, userID uuid.UUID, label, b64, mime string) (string, error) {
	data, err := decode(b64)
	if err != nil {
		return "", err
	}
	if len(data) > maxDocBytes {
		return "", fmt.Errorf("ảnh quá lớn")
	}
	if mime == "" {
		mime = "image/jpeg"
	}
	key := fmt.Sprintf("kyc/%s/%s-%s.%s", userID, uuid.NewString(), label, ext(mime))
	if err := h.store.PutObject(ctx, key, mime, data); err != nil {
		slog.Warn("kyc upload failed", "err", err, "label", label)
		return "", errStorage
	}
	return key, nil
}

func (h *Handler) presign(ctx context.Context, key string) string {
	if key == "" {
		return ""
	}
	u, err := h.store.PresignGet(ctx, key, 10*time.Minute)
	if err != nil {
		slog.Warn("kyc presign failed", "err", err)
		return ""
	}
	return u
}

func (h *Handler) presignPtr(ctx context.Context, key *string) string {
	if key == nil {
		return ""
	}
	return h.presign(ctx, *key)
}

var errStorage = errors.New("không tải được ảnh lên kho lưu trữ")

func respondUpload(c *gin.Context, err error) {
	if errors.Is(err, errStorage) {
		respond.Fail(c, http.StatusUnprocessableEntity, respond.CodeSystemNotReady, err.Error())
		return
	}
	respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "ảnh không hợp lệ")
}

func respondReview(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		respond.Fail(c, http.StatusNotFound, respond.CodeNotFound, "không tìm thấy hồ sơ")
		return
	}
	respond.Fail(c, http.StatusInternalServerError, respond.CodeInternal, "có lỗi xảy ra")
}

func parseID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respond.Fail(c, http.StatusBadRequest, respond.CodeValidation, "id không hợp lệ")
		return uuid.Nil, false
	}
	return id, true
}

func decode(b64 string) ([]byte, error) {
	if i := strings.Index(b64, ","); strings.HasPrefix(b64, "data:") && i >= 0 {
		b64 = b64[i+1:]
	}
	data, err := base64.StdEncoding.DecodeString(strings.TrimSpace(b64))
	if err != nil || len(data) == 0 {
		return nil, fmt.Errorf("ảnh không hợp lệ")
	}
	return data, nil
}

func ext(mime string) string {
	switch mime {
	case "image/png":
		return "png"
	case "image/webp":
		return "webp"
	default:
		return "jpg"
	}
}

func nz(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}
