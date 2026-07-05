// Package postgres provides a pgx connection pool with sensible defaults.
package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect builds a pgxpool and tries to verify it with a bounded retry.
//
// The initial ping is retried with backoff because on a host reboot Postgres and
// the API restart in parallel and Docker's depends_on ordering no longer applies,
// so the DB is frequently unreachable for the first few seconds.
//
// If the DB is still unreachable after the retry window, Connect returns the LIVE
// (non-nil) pool together with the last ping error, NOT a nil pool. pgxpool
// reconnects lazily, so returning the pool lets the app degrade gracefully — the
// readiness gate reports "database unreachable" and self-heals once Postgres is up
// — instead of nil-panicking on every DB-backed request until a manual restart.
func Connect(ctx context.Context, url string, maxConns, minConns int32) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	if maxConns > 0 {
		cfg.MaxConns = maxConns
	}
	if minConns > 0 {
		cfg.MinConns = minConns
	}
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute
	cfg.HealthCheckPeriod = time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}

	const attempts = 15 // ~30s total: enough to outlast a slow DB start at boot.
	var pingErr error
	for attempt := 1; attempt <= attempts; attempt++ {
		pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		pingErr = pool.Ping(pingCtx)
		cancel()
		if pingErr == nil {
			return pool, nil
		}
		select {
		case <-ctx.Done():
			return pool, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	// Still unreachable: hand back the live pool so callers self-heal.
	return pool, pingErr
}
