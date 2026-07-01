// Package admin implements the system-admin config surface: managing encrypted
// secrets / AI providers and testing connectivity to Gemini, Resend, and MinIO.
package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"
)

// geminiError extracts Google's real error message (so the admin sees the true
// reason: invalid key vs. API not enabled vs. referrer/IP restriction…).
func geminiError(resp *http.Response) error {
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1000))
	var e struct {
		Error struct {
			Message string `json:"message"`
			Status  string `json:"status"`
		} `json:"error"`
	}
	if json.Unmarshal(body, &e) == nil && e.Error.Message != "" {
		return fmt.Errorf("Gemini: %s", e.Error.Message)
	}
	return fmt.Errorf("Gemini trả về lỗi %d", resp.StatusCode)
}

// Tester performs lightweight connectivity checks against external services.
// Each returns nil on success or a user-safe error (no secret leakage).
type Tester struct {
	hc *http.Client
}

func NewTester() *Tester {
	return &Tester{hc: &http.Client{Timeout: 8 * time.Second}}
}

// TestGemini lists models with the given key — a cheap auth check.
func (t *Tester) TestGemini(ctx context.Context, apiKey string) error {
	if apiKey == "" {
		return fmt.Errorf("missing api key")
	}
	url := "https://generativelanguage.googleapis.com/v1beta/models?key=" + strings.TrimSpace(apiKey)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	resp, err := t.hc.Do(req)
	if err != nil {
		return fmt.Errorf("cannot reach Gemini")
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
		return nil
	default:
		return geminiError(resp)
	}
}

// TestOpenAI lists models with the given key — a cheap auth check.
func (t *Tester) TestOpenAI(ctx context.Context, apiKey string) error {
	if apiKey == "" {
		return fmt.Errorf("missing api key")
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.openai.com/v1/models", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	resp, err := t.hc.Do(req)
	if err != nil {
		return fmt.Errorf("cannot reach OpenAI")
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
		return nil
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("invalid OpenAI API key")
	default:
		return fmt.Errorf("OpenAI returned status %d", resp.StatusCode)
	}
}

// TestAI dispatches the auth check to the right provider ("openai" or, by
// default, "gemini").
func (t *Tester) TestAI(ctx context.Context, provider, apiKey string) error {
	if provider == "openai" {
		return t.TestOpenAI(ctx, apiKey)
	}
	return t.TestGemini(ctx, apiKey)
}

// ListModels returns the chat-capable model IDs a key can access, newest-looking
// first. Used by the admin UI to validate a key AND surface its usable models.
func (t *Tester) ListModels(ctx context.Context, provider, apiKey string) ([]string, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("missing api key")
	}
	if provider == "openai" {
		return t.listOpenAIModels(ctx, apiKey)
	}
	return t.listGeminiModels(ctx, apiKey)
}

func (t *Tester) listGeminiModels(ctx context.Context, apiKey string) ([]string, error) {
	url := "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=" + strings.TrimSpace(apiKey)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	resp, err := t.hc.Do(req)
	if err != nil {
		return nil, fmt.Errorf("cannot reach Gemini")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, geminiError(resp)
	}
	var body struct {
		Models []struct {
			Name                       string   `json:"name"`
			SupportedGenerationMethods []string `json:"supportedGenerationMethods"`
		} `json:"models"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("cannot read Gemini response")
	}
	var out []string
	for _, m := range body.Models {
		if !contains(m.SupportedGenerationMethods, "generateContent") {
			continue
		}
		id := strings.TrimPrefix(m.Name, "models/")
		if strings.HasPrefix(id, "gemini-") {
			out = append(out, id)
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(out)))
	return out, nil
}

func (t *Tester) listOpenAIModels(ctx context.Context, apiKey string) ([]string, error) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.openai.com/v1/models", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	resp, err := t.hc.Do(req)
	if err != nil {
		return nil, fmt.Errorf("cannot reach OpenAI")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid OpenAI API key")
	}
	var body struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("cannot read OpenAI response")
	}
	var out []string
	for _, m := range body.Data {
		// Keep chat-completion families (gpt-* and the o-series reasoning models).
		if strings.HasPrefix(m.ID, "gpt") || isOSeries(m.ID) {
			out = append(out, m.ID)
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(out)))
	return out, nil
}

func contains(s []string, v string) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

// isOSeries reports whether id looks like an OpenAI reasoning model (o1, o3, o4…).
func isOSeries(id string) bool {
	if len(id) < 2 || id[0] != 'o' {
		return false
	}
	return id[1] >= '0' && id[1] <= '9'
}

// TestResend validates the key by calling the domains endpoint.
//
// Resend "restricted" keys (sending-only) can't list domains and come back 401
// with name=restricted_api_key — those keys are still VALID for sending, so we
// accept them. Only a genuinely bad key (invalid_api_key) is rejected.
func (t *Tester) TestResend(ctx context.Context, apiKey string) error {
	if apiKey == "" {
		return fmt.Errorf("missing api key")
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.resend.com/domains", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)
	resp, err := t.hc.Do(req)
	if err != nil {
		return fmt.Errorf("cannot reach Resend")
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
		return nil
	case http.StatusUnauthorized, http.StatusForbidden:
		var body struct {
			Name string `json:"name"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&body)
		if body.Name == "restricted_api_key" {
			return nil // valid key, just limited to sending
		}
		return fmt.Errorf("invalid Resend API key")
	default:
		return fmt.Errorf("Resend returned status %d", resp.StatusCode)
	}
}
