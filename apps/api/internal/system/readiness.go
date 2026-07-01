// Package system implements the configuration "activation gate".
//
// The app refuses business traffic until a system admin has configured the
// mandatory integrations (AI provider, email, storage). Phase 1 wires the real
// checks: AI provider + email come from the encrypted sysconfig cache; storage
// pings the MinIO bucket.
package system

import (
	"context"
	"strings"
	"time"

	"github.com/canopy/api/internal/sysconfig"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Check is a single readiness probe result.
type Check struct {
	OK     bool   `json:"ok"`
	Detail string `json:"detail,omitempty"`
}

// Status is the public readiness snapshot returned by GET /system/status.
type Status struct {
	Ready     bool             `json:"ready"`
	Version   string           `json:"version"`
	Missing   []string         `json:"missing"`
	Checks    map[string]Check `json:"checks"`
	CheckedAt time.Time        `json:"checked_at"`
}

// StorageChecker is satisfied by storage.Client (BucketReachable).
type StorageChecker interface {
	BucketReachable(ctx context.Context) error
}

// Readiness aggregates individual checks into an overall ready state.
type Readiness struct {
	db      *pgxpool.Pool
	cfg     *sysconfig.Service
	storage StorageChecker
}

func NewReadiness(db *pgxpool.Pool, cfg *sysconfig.Service, storage StorageChecker) *Readiness {
	return &Readiness{db: db, cfg: cfg, storage: storage}
}

// Snapshot computes the current readiness.
func (r *Readiness) Snapshot(ctx context.Context) Status {
	checks := map[string]Check{
		"database":    r.checkDatabase(ctx),
		"ai_provider": r.checkAIProvider(ctx),
		"email":       r.checkEmail(ctx),
		"storage":     r.checkStorage(ctx),
	}

	required := []string{"database", "ai_provider", "email", "storage"}
	var missing []string
	for _, key := range required {
		if !checks[key].OK {
			missing = append(missing, key)
		}
	}

	return Status{
		Ready:     len(missing) == 0,
		Version:   versionString(),
		Missing:   missing,
		Checks:    checks,
		CheckedAt: time.Now().UTC(),
	}
}

func (r *Readiness) checkDatabase(ctx context.Context) Check {
	if r.db == nil {
		return Check{OK: false, Detail: "no database connection"}
	}
	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := r.db.Ping(pingCtx); err != nil {
		return Check{OK: false, Detail: "database unreachable"}
	}
	return Check{OK: true}
}

func (r *Readiness) checkAIProvider(ctx context.Context) Check {
	if r.cfg == nil {
		return Check{OK: false, Detail: "config service unavailable"}
	}
	if _, ok := r.cfg.DefaultProvider(ctx); !ok {
		return Check{OK: false, Detail: "no enabled default AI provider with API key (configure in Admin)"}
	}
	return Check{OK: true}
}

func (r *Readiness) checkEmail(ctx context.Context) Check {
	if r.cfg == nil || strings.TrimSpace(r.cfg.ResendAPIKey(ctx)) == "" {
		return Check{OK: false, Detail: "Resend API key not configured (configure in Admin)"}
	}
	return Check{OK: true}
}

func (r *Readiness) checkStorage(ctx context.Context) Check {
	if r.storage == nil {
		return Check{OK: false, Detail: "object storage not configured"}
	}
	if err := r.storage.BucketReachable(ctx); err != nil {
		return Check{OK: false, Detail: "object storage bucket unreachable"}
	}
	return Check{OK: true}
}
