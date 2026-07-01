// Package mailer sends transactional email via Resend, using the API key and
// sender configured at runtime in the Admin portal (stored in sysconfig).
package mailer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Config supplies the runtime Resend credentials (satisfied by sysconfig.Service).
type Config interface {
	ResendAPIKey(ctx context.Context) string
	ResendFrom(ctx context.Context) string
}

type Mailer struct {
	cfg Config
	hc  *http.Client
}

func New(cfg Config) *Mailer {
	return &Mailer{cfg: cfg, hc: &http.Client{Timeout: 8 * time.Second}}
}

// Configured reports whether a Resend key is present (so callers can skip).
func (m *Mailer) Configured(ctx context.Context) bool {
	return m.cfg.ResendAPIKey(ctx) != ""
}

// Send delivers one HTML email. Returns an error if Resend is unconfigured or
// rejects the request — callers treat verification email as best-effort.
func (m *Mailer) Send(ctx context.Context, to, subject, html string) error {
	key := m.cfg.ResendAPIKey(ctx)
	if key == "" {
		return fmt.Errorf("email not configured")
	}
	from := m.cfg.ResendFrom(ctx)
	if from == "" {
		from = "Canopy <onboarding@resend.dev>"
	}
	payload, _ := json.Marshal(map[string]any{
		"from":    from,
		"to":      []string{to},
		"subject": subject,
		"html":    html,
	})
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")
	resp, err := m.hc.Do(req)
	if err != nil {
		return fmt.Errorf("cannot reach Resend")
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("Resend returned status %d", resp.StatusCode)
	}
	return nil
}
