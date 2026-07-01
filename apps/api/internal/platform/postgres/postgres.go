// Package postgres provides a pgx connection pool with sensible defaults.
package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect builds and verifies a pgxpool. A failed initial ping is returned as an
// error; callers decide whether that is fatal (Phase 0 treats it as non-fatal so
// the readiness gate can report it instead of crash-looping).
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

	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}
