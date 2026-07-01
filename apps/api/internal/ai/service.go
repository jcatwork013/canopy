// Package ai implements plant identification and disease diagnosis by calling
// the configured AI provider (Gemini) with image input and a strict JSON schema.
package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/canopy/api/internal/sysconfig"
)

func encodeBase64(b []byte) string { return base64.StdEncoding.EncodeToString(b) }

var ErrNotConfigured = fmt.Errorf("AI provider chưa được cấu hình")

// Providers supplies the active AI provider (satisfied by sysconfig.Service).
type Providers interface {
	DefaultProvider(ctx context.Context) (sysconfig.Provider, bool)
}

type Service struct {
	cfg Providers
	hc  *http.Client
}

func NewService(cfg Providers) *Service {
	return &Service{cfg: cfg, hc: &http.Client{Timeout: 60 * time.Second}}
}

// ChatMessage is one turn in a conversation.
type ChatMessage struct {
	Role    string `json:"role"` // 'user' | 'assistant'
	Content string `json:"content"`
}

// Chat answers a free-form question (optionally about an attached plant image).
// Model routing: a cheap model for simple questions, the configured (premium)
// model only when the question is genuinely hard — to optimise token cost.
func (s *Service) Chat(ctx context.Context, msgs []ChatMessage, img *Image) (string, string, error) {
	p, ok := s.cfg.DefaultProvider(ctx)
	if !ok || p.APIKey == "" {
		return "", "", ErrNotConfigured
	}
	if p.Type != "" && p.Type != "gemini" {
		return "", "", fmt.Errorf("nhà cung cấp %q chưa hỗ trợ chat", p.Type)
	}
	hard := img != nil
	if !hard && len(msgs) > 0 {
		hard = isHardQuestion(msgs[len(msgs)-1].Content)
	}
	model := "gemini-2.5-flash"
	if hard {
		model = p.Model
		if model == "" {
			model = "gemini-2.5-pro"
		}
	}

	contents := make([]map[string]any, 0, len(msgs))
	for i, m := range msgs {
		role := "user"
		if m.Role == "assistant" {
			role = "model"
		}
		parts := []map[string]any{{"text": m.Content}}
		// Attach the supplied image to the newest user turn so follow-up photos
		// the user sends mid-conversation are understood.
		if img != nil && role == "user" && i == len(msgs)-1 {
			parts = append(parts, map[string]any{
				"inline_data": map[string]any{"mime_type": img.Mime, "data": encodeBase64(img.Data)},
			})
		}
		contents = append(contents, map[string]any{"role": role, "parts": parts})
	}

	reqBody, _ := json.Marshal(map[string]any{
		"system_instruction": map[string]any{"parts": []map[string]any{{"text": chatSystemPrompt}}},
		"contents":           contents,
		"generationConfig":   map[string]any{"temperature": 0.4},
	})
	text, err := s.callGemini(ctx, model, p.APIKey, reqBody)
	if err != nil {
		return "", "", err
	}
	return text, model, nil
}

// isHardQuestion is a cheap heuristic (no extra LLM call) to route to the
// premium model only when needed.
func isHardQuestion(q string) bool {
	if len([]rune(q)) > 200 {
		return true
	}
	m := strings.ToLower(q)
	for _, k := range []string{
		"tại sao", "vì sao", "nguyên nhân", "chữa", "điều trị", "phác đồ", "thuốc",
		"nghiêm trọng", "chết", "héo", "thối rễ", "vàng lá", "đốm", "so sánh", "chi tiết", "phân tích",
	} {
		if strings.Contains(m, k) {
			return true
		}
	}
	return false
}

const chatSystemPrompt = `Bạn là SynapX Pro AI — chuyên gia thực vật học thân thiện, trả lời bằng tiếng Việt, rõ ràng và thực tế.

ĐỊNH DẠNG (bắt buộc, dùng Markdown để dễ đọc):
- Mở đầu bằng MỘT thẻ trạng thái ở dòng đầu tiên, đúng một trong:
  [[health:ok]]      → cây ổn/khỏe
  [[health:warning]] → chưa ổn, cần điều chỉnh chăm sóc (vd thiếu/thừa nước, thiếu sáng, thiếu dinh dưỡng)
  [[health:disease]] → có dấu hiệu sâu bệnh
  [[health:none]]    → câu hỏi không nói về tình trạng một cây cụ thể
- Sau đó dùng tiêu đề ngắn (vd "**Nhận định**", "**Việc cần làm**"), gạch đầu dòng "- ", in đậm **từ khóa** quan trọng.
- Ngắn gọn, đi thẳng vào việc; tránh đoạn văn dài lê thê.

NỘI DUNG CHĂM SÓC — luôn cụ thể, định lượng được (đây là điều người dùng cần nhất):
- **Nước**: tưới nhiều/vừa/ít, bao nhiêu ngày một lần, dấu hiệu nhận biết thừa/thiếu nước.
- **Phân bón**: loại phân nên dùng, liều lượng nhiều/ít, mấy tuần một lần, khi nào NGƯNG bón.
- **Ánh sáng, đất, độ ẩm, nhiệt độ**: nêu khi liên quan, kèm ngưỡng cụ thể.
Khi cây bị bệnh: nêu (1) nhận định, (2) mức độ, (3) cách xử lý theo bước, (4) phòng ngừa.

Nếu người dùng gửi kèm ảnh, hãy phân tích đúng cây trong ảnh hiện tại; đừng suy đoán cây khác.
LUÔN kết thúc bằng dòng: "> ⚠️ Thông tin mang tính tham khảo, không thay thế ý kiến chuyên gia thực vật."`

// --- result types (mirror packages/shared/src/types/domain.ts) ---

type CareProfile struct {
	Watering     string   `json:"watering"`
	Light        string   `json:"light"`
	Soil         string   `json:"soil"`
	Temperature  string   `json:"temperature"`
	Humidity     string   `json:"humidity"`
	Fertilizer   string   `json:"fertilizer"`
	SpecialNotes []string `json:"special_notes"`
}

type IdentifyResult struct {
	IsPlant        *bool    `json:"is_plant"`
	ScientificName string   `json:"scientific_name"`
	CommonNames    []string `json:"common_names"`
	Family         string   `json:"family"`
	Confidence     float64  `json:"confidence"`
	Alternatives   []struct {
		ScientificName string  `json:"scientific_name"`
		Confidence     float64 `json:"confidence"`
	} `json:"alternatives"`
	Characteristics []string    `json:"characteristics"`
	CareProfile     CareProfile `json:"care_profile"`
}

type DiagnoseResult struct {
	IsPlant          *bool    `json:"is_plant"`
	Plant            string   `json:"plant"`
	DiseaseName      string   `json:"disease_name"`
	Category         string   `json:"category"`
	Confidence       float64  `json:"confidence"`
	Severity         string   `json:"severity"`
	ObservedSymptoms []string `json:"observed_symptoms"`
	LikelyCauses     []string `json:"likely_causes"`
	Differential     []struct {
		Name       string  `json:"name"`
		Confidence float64 `json:"confidence"`
	} `json:"differential"`
	ImmediateActions []string `json:"immediate_actions"`
	NeedsMoreInfo    []string `json:"needs_more_info"`
}

// --- Care roadmap (phác đồ chăm sóc) ---

// CareRoadmapInput is the context handed to the model to build a roadmap.
type CareRoadmapInput struct {
	PlantName  string // tên cây nếu biết
	Source     string // "identify" | "diagnose" | "manual"
	HealthHint string // "ok" | "warning" | "disease" (gợi ý từ lần quét trước)
	Context    string // tóm tắt kết quả nhận diện/chẩn đoán hoặc ghi chú của người dùng
}

type CareRoadmapStep struct {
	DayOffset   int    `json:"day_offset"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"` // water|fertilize|light|soil|prune|monitor|treat|other
	Amount      string `json:"amount"`   // "nhiều/vừa/ít", liều lượng cụ thể
}

type CareRoadmap struct {
	Title        string            `json:"title"`
	PlantName    string            `json:"plant_name"`
	Health       string            `json:"health"` // ok|warning|disease
	Summary      string            `json:"summary"`
	Watering     string            `json:"watering"`
	Fertilizer   string            `json:"fertilizer"`
	Light        string            `json:"light"`
	Prevention   string            `json:"prevention"`
	WarningSigns []string          `json:"warning_signs"`
	DurationDays int               `json:"duration_days"`
	Steps        []CareRoadmapStep `json:"steps"`
}

// GenerateCareRoadmap asks the model for a structured, actionable care plan.
func (s *Service) GenerateCareRoadmap(ctx context.Context, in CareRoadmapInput) (*CareRoadmap, error) {
	var b strings.Builder
	b.WriteString(careRoadmapPrompt)
	if strings.TrimSpace(in.PlantName) != "" {
		b.WriteString("\n\nTên cây: " + in.PlantName)
	}
	if strings.TrimSpace(in.HealthHint) != "" {
		b.WriteString("\nTình trạng ghi nhận trước đó: " + in.HealthHint)
	}
	if strings.TrimSpace(in.Context) != "" {
		b.WriteString("\nBối cảnh / kết quả quét:\n" + in.Context)
	}
	var out CareRoadmap
	if err := s.generate(ctx, b.String(), nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// Image is one decoded upload passed to the model.
type Image struct {
	Mime string
	Data []byte
}

func (s *Service) Identify(ctx context.Context, img Image) (*IdentifyResult, error) {
	var out IdentifyResult
	if err := s.generate(ctx, identifyPrompt, []Image{img}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (s *Service) Diagnose(ctx context.Context, imgs []Image, symptoms string) (*DiagnoseResult, error) {
	prompt := diagnosePrompt
	if strings.TrimSpace(symptoms) != "" {
		prompt += "\n\nMô tả triệu chứng từ người dùng: " + symptoms
	}
	var out DiagnoseResult
	if err := s.generate(ctx, prompt, imgs, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// generate calls Gemini generateContent with the images + prompt in JSON mode,
// then unmarshals the model's JSON into out.
func (s *Service) generate(ctx context.Context, prompt string, imgs []Image, out any) error {
	p, ok := s.cfg.DefaultProvider(ctx)
	if !ok || p.APIKey == "" {
		return ErrNotConfigured
	}
	model := p.Model
	if model == "" {
		model = "gemini-2.5-flash"
	}
	// Only Gemini is supported for vision right now.
	if p.Type != "" && p.Type != "gemini" {
		return fmt.Errorf("nhà cung cấp %q chưa hỗ trợ nhận diện ảnh", p.Type)
	}

	parts := []map[string]any{{"text": prompt}}
	for _, im := range imgs {
		parts = append(parts, map[string]any{
			"inline_data": map[string]any{
				"mime_type": im.Mime,
				"data":      encodeBase64(im.Data),
			},
		})
	}
	reqBody, _ := json.Marshal(map[string]any{
		"contents": []map[string]any{{"parts": parts}},
		"generationConfig": map[string]any{
			"response_mime_type": "application/json",
			"temperature":        0.2,
		},
	})

	text, err := s.callGemini(ctx, model, p.APIKey, reqBody)
	if err != nil {
		return err
	}
	if err := json.Unmarshal([]byte(cleanJSON(text)), out); err != nil {
		return fmt.Errorf("không phân tích được kết quả AI")
	}
	return nil
}

// callGemini POSTs to generateContent and returns the model's text part.
func (s *Service) callGemini(ctx context.Context, model, key string, reqBody []byte) (string, error) {
	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		model, key)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.hc.Do(req)
	if err != nil {
		slog.Warn("gemini call failed", "err", err, "model", model)
		return "", fmt.Errorf("không gọi được Gemini")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 800))
		slog.Warn("gemini non-200", "status", resp.StatusCode, "model", model, "body", string(b))
		if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusForbidden {
			return "", fmt.Errorf("Khóa AI không hợp lệ hoặc model không khả dụng — kiểm tra lại trong Quản trị → AI")
		}
		return "", fmt.Errorf("Gemini lỗi %d", resp.StatusCode)
	}
	var gr struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return "", fmt.Errorf("không đọc được phản hồi Gemini")
	}
	if len(gr.Candidates) == 0 || len(gr.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("Gemini không trả về kết quả")
	}
	return gr.Candidates[0].Content.Parts[0].Text, nil
}

// cleanJSON strips markdown fences the model occasionally adds.
func cleanJSON(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}

const identifyPrompt = `Bạn là SynapX Pro AI — chuyên gia thực vật. Quan sát ảnh và nhận diện loài cây.
Nếu ảnh KHÔNG phải là cây/thực vật, đặt "is_plant": false và để các trường còn lại rỗng/0.
Trả về DUY NHẤT một JSON hợp lệ, tất cả nội dung bằng tiếng Việt, đúng cấu trúc:
{
  "is_plant": true,
  "scientific_name": "tên khoa học",
  "common_names": ["tên thường gọi"],
  "family": "họ thực vật",
  "confidence": 0.0,
  "alternatives": [{"scientific_name":"loài khả dĩ khác","confidence":0.0}],
  "characteristics": ["đặc điểm nhận dạng nổi bật"],
  "care_profile": {
    "watering":"hướng dẫn tưới nước",
    "light":"nhu cầu ánh sáng",
    "soil":"loại đất phù hợp",
    "temperature":"khoảng nhiệt độ",
    "humidity":"độ ẩm",
    "fertilizer":"bón phân",
    "special_notes":["lưu ý đặc biệt"]
  }
}
confidence là số thực 0..1. Nếu không chắc, vẫn đưa phỏng đoán tốt nhất.`

const diagnosePrompt = `Bạn là SynapX Pro AI — chuyên gia bệnh học thực vật.
Có thể có NHIỀU ảnh: ảnh tổng thể cây và ảnh cận cảnh vùng bất thường. Hãy kết hợp tất cả để:
1) Nhận diện loài cây (nếu xác định được).
2) Nếu cây KHỎE MẠNH, bình thường: đặt "category":"healthy", "severity":"mild", "disease_name":"Cây khỏe mạnh", và đưa lời khuyên chăm sóc duy trì vào "immediate_actions".
3) Nếu có vấn đề: chẩn đoán chính xác và đưa hướng xử lý THÔNG MINH, cụ thể, theo thứ tự ưu tiên.
Nếu ảnh KHÔNG phải là cây/thực vật, đặt "is_plant": false và để các trường còn lại rỗng/0.
Trả về DUY NHẤT một JSON hợp lệ, tất cả nội dung bằng tiếng Việt, đúng cấu trúc:
{
  "is_plant": true,
  "plant":"tên loài cây nếu nhận diện được (rỗng nếu không chắc)",
  "disease_name":"tên bệnh/vấn đề (hoặc 'Cây khỏe mạnh')",
  "category":"healthy|fungal|bacterial|viral|pest|nutrient|environmental|unknown",
  "confidence":0.0,
  "severity":"mild|moderate|severe",
  "observed_symptoms":["triệu chứng quan sát được"],
  "likely_causes":["nguyên nhân khả dĩ"],
  "differential":[{"name":"chẩn đoán phân biệt","confidence":0.0}],
  "immediate_actions":["việc cần làm ngay / lời khuyên chăm sóc"],
  "needs_more_info":["thông tin cần thêm để chắc chắn"]
}
confidence là số thực 0..1.`

const careRoadmapPrompt = `Bạn là SynapX Pro AI — chuyên gia chăm sóc cây. Hãy lập một PHÁC ĐỒ (roadmap) chăm sóc cây HIỆU QUẢ, cụ thể, định lượng được và theo trình tự thời gian, để người dùng làm theo.
Yêu cầu quan trọng:
- Mỗi bước phải nói RÕ liều lượng: nước nhiều/vừa/ít và mấy ngày/lần; phân loại gì, liều bao nhiêu, mấy tuần/lần; ánh sáng/đất nếu cần.
- "health": "ok" nếu cây khỏe (phác đồ duy trì), "warning" nếu chăm sóc chưa ổn cần điều chỉnh, "disease" nếu có sâu/bệnh (phác đồ điều trị).
- "day_offset": ngày thứ mấy nên làm (0 = hôm nay/ngay). Sắp xếp tăng dần, bao quát cả giai đoạn ổn định.
- "category" mỗi bước thuộc: water|fertilize|light|soil|prune|monitor|treat|other.
- "amount": liều lượng ngắn gọn (vd "1 lần/ngày, đẫm", "ít, 2 tuần/lần").
Trả về DUY NHẤT một JSON hợp lệ, tất cả nội dung tiếng Việt, đúng cấu trúc:
{
  "title":"tên ngắn của phác đồ",
  "plant_name":"tên cây",
  "health":"ok|warning|disease",
  "summary":"tóm tắt 1-2 câu mục tiêu phác đồ",
  "watering":"tổng quan nhu cầu nước (định lượng)",
  "fertilizer":"tổng quan phân bón (loại + liều + tần suất)",
  "light":"tổng quan ánh sáng",
  "prevention":"lời khuyên phòng ngừa",
  "warning_signs":["dấu hiệu cần chú ý / báo động"],
  "duration_days":14,
  "steps":[
    {"day_offset":0,"title":"việc cần làm","description":"chi tiết","category":"water","amount":"vừa, 3 ngày/lần"}
  ]
}
Đưa ra 5-10 bước thực tế. duration_days là số ngày tổng của phác đồ.`
