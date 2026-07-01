// Package config loads process-level configuration from the environment.
//
// IMPORTANT: only infrastructure/bootstrap values live here. Tenant-facing
// secrets (Gemini key, Resend key) are NOT read from env — they are entered in
// the Admin portal and stored AES-256-GCM encrypted in the database. The single
// env secret that matters for secrets-at-rest is CONFIG_ENCRYPTION_KEY.
package config

import (
	"encoding/base64"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

// Version is overridden at build time via -ldflags "-X .../config.Version=...".
var Version = "dev"

type Config struct {
	AppEnv     string
	AppPort    string
	AppBaseURL string
	APIBaseURL string
	LogLevel   string
	LogFormat  string

	CORSAllowedOrigins []string

	DatabaseURL string
	DBMaxConns  int32
	DBMinConns  int32

	JWTAccessSecret  string
	JWTRefreshSecret string
	JWTAccessTTL     time.Duration
	JWTRefreshTTL    time.Duration

	// ConfigEncryptionKey is the 32-byte AES key used to encrypt secrets stored
	// in the system_configs / ai_providers tables.
	ConfigEncryptionKey []byte

	BootstrapAdminEmail    string
	BootstrapAdminPassword string

	MinIOEndpoint  string
	MinIOAccessKey string
	MinIOSecretKey string
	MinIOBucket    string
	MinIOUseSSL    bool
	MinIOPublicURL string

	RateLimitAuthPerMin int
	RateLimitAIPerMin   int
}

// Load reads configuration from the environment, applying defaults suitable for
// local development. It fails fast only on values that cannot be defaulted
// safely (e.g. a malformed encryption key in production).
func Load() (*Config, error) {
	c := &Config{
		AppEnv:     env("APP_ENV", "development"),
		AppPort:    env("APP_PORT", "8080"),
		AppBaseURL: env("APP_BASE_URL", "http://localhost:5173"),
		APIBaseURL: env("API_PUBLIC_URL", "http://localhost:8080"),
		LogLevel:   env("LOG_LEVEL", "info"),
		LogFormat:  env("LOG_FORMAT", "text"),

		CORSAllowedOrigins: splitCSV(env("CORS_ALLOWED_ORIGINS", "http://localhost:5173")),

		DatabaseURL: env("DATABASE_URL", "postgres://canopy:canopy@localhost:5432/canopy?sslmode=disable"),
		DBMaxConns:  int32(envInt("DB_MAX_CONNS", 10)),
		DBMinConns:  int32(envInt("DB_MIN_CONNS", 2)),

		JWTAccessSecret:  env("JWT_ACCESS_SECRET", ""),
		JWTRefreshSecret: env("JWT_REFRESH_SECRET", ""),
		JWTAccessTTL:     envDuration("JWT_ACCESS_TTL", 15*time.Minute),
		JWTRefreshTTL:    envDuration("JWT_REFRESH_TTL", 720*time.Hour),

		BootstrapAdminEmail:    env("BOOTSTRAP_ADMIN_EMAIL", ""),
		BootstrapAdminPassword: env("BOOTSTRAP_ADMIN_PASSWORD", ""),

		MinIOEndpoint:  env("MINIO_ENDPOINT", "localhost:9000"),
		MinIOAccessKey: env("MINIO_ACCESS_KEY", "canopyadmin"),
		MinIOSecretKey: env("MINIO_SECRET_KEY", "canopyadmin"),
		MinIOBucket:    env("MINIO_BUCKET", "canopy"),
		MinIOUseSSL:    envBool("MINIO_USE_SSL", false),
		MinIOPublicURL: env("MINIO_PUBLIC_URL", "http://localhost:9000"),

		RateLimitAuthPerMin: envInt("RATE_LIMIT_AUTH_PER_MIN", 10),
		RateLimitAIPerMin:   envInt("RATE_LIMIT_AI_PER_MIN", 20),
	}

	key, err := loadEncryptionKey(env("CONFIG_ENCRYPTION_KEY", ""), c.AppEnv)
	if err != nil {
		return nil, err
	}
	c.ConfigEncryptionKey = key

	return c, nil
}

func (c *Config) IsProduction() bool { return c.AppEnv == "production" }

// devKey is a fixed 32-byte key used ONLY in development when CONFIG_ENCRYPTION_KEY
// is missing or invalid, so the app boots without ceremony. NEVER used in prod.
var devKey = []byte("canopy-dev-insecure-key-32bytes!")

// loadEncryptionKey decodes the base64 master key. In production a valid 32-byte
// key is mandatory; in development an absent/invalid key falls back to devKey.
func loadEncryptionKey(raw, appEnv string) ([]byte, error) {
	prod := appEnv == "production"

	if raw == "" {
		if prod {
			return nil, fmt.Errorf("CONFIG_ENCRYPTION_KEY is required in production")
		}
		return devKey, nil
	}

	key, err := base64.StdEncoding.DecodeString(raw)
	if err != nil || len(key) != 32 {
		if prod {
			return nil, fmt.Errorf("CONFIG_ENCRYPTION_KEY must be a base64-encoded 32-byte key")
		}
		// Dev: tolerate the .env placeholder so first-run "make api" just works.
		slog.Warn("CONFIG_ENCRYPTION_KEY invalid; using insecure dev key (set a real key via `make genkey`)")
		return devKey, nil
	}
	return key, nil
}

// --- small env helpers ---

func env(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v, ok := os.LookupEnv(key); ok {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func envBool(key string, def bool) bool {
	if v, ok := os.LookupEnv(key); ok {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return def
}

func envDuration(key string, def time.Duration) time.Duration {
	if v, ok := os.LookupEnv(key); ok {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return def
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
