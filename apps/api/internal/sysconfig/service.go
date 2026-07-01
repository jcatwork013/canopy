package sysconfig

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"github.com/canopy/api/internal/crypto"
	"github.com/google/uuid"
)

// SiteConfig is the public-facing website configuration (admin-editable).
type SiteConfig struct {
	Tagline      string   `json:"tagline"`
	ContactPhone string   `json:"contact_phone"`
	HeroImages   []string `json:"hero_images"`
}

// Provider is a decrypted AI provider (key in plaintext, in-memory only).
type Provider struct {
	ID        uuid.UUID
	Name      string
	Type      string
	Model     string
	APIKey    string
	Enabled   bool
	IsDefault bool
}

// Service loads system config + AI providers from the DB, decrypts secrets, and
// caches them in memory. Writes invalidate the cache immediately; reads refresh
// lazily once the TTL elapses.
type Service struct {
	repo   *Repo
	cipher *crypto.Cipher
	ttl    time.Duration

	mu         sync.RWMutex
	loadedAt   time.Time
	configs    map[string]string
	categories map[string]string
	secrets    map[string]bool
	providers  []Provider
}

func NewService(repo *Repo, cipher *crypto.Cipher, ttl time.Duration) *Service {
	if ttl <= 0 {
		ttl = 30 * time.Second
	}
	return &Service{
		repo:       repo,
		cipher:     cipher,
		ttl:        ttl,
		configs:    map[string]string{},
		categories: map[string]string{},
		secrets:    map[string]bool{},
	}
}

// Reload forces a full refresh from the DB.
func (s *Service) Reload(ctx context.Context) error {
	rows, err := s.repo.ListConfigs(ctx)
	if err != nil {
		return err
	}
	configs := make(map[string]string, len(rows))
	categories := make(map[string]string, len(rows))
	secrets := make(map[string]bool, len(rows))
	for _, r := range rows {
		categories[r.Key] = r.Category
		secrets[r.Key] = r.IsSecret
		if len(r.ValueEnc) == 0 {
			continue
		}
		v, derr := s.cipher.DecryptString(r.ValueEnc)
		if derr != nil {
			// A key encrypted under a different master key — skip, do not crash.
			continue
		}
		configs[r.Key] = v
	}

	prows, err := s.repo.ListProviders(ctx)
	if err != nil {
		return err
	}
	providers := make([]Provider, 0, len(prows))
	for _, p := range prows {
		key := ""
		if len(p.APIKeyEnc) > 0 {
			if v, derr := s.cipher.DecryptString(p.APIKeyEnc); derr == nil {
				key = v
			}
		}
		providers = append(providers, Provider{
			ID: p.ID, Name: p.Name, Type: p.Type, Model: p.Model,
			APIKey: key, Enabled: p.Enabled, IsDefault: p.IsDefault,
		})
	}

	s.mu.Lock()
	s.configs, s.categories, s.secrets, s.providers = configs, categories, secrets, providers
	s.loadedAt = time.Now()
	s.mu.Unlock()
	return nil
}

// ensureFresh reloads lazily if the cache is older than the TTL.
func (s *Service) ensureFresh(ctx context.Context) {
	s.mu.RLock()
	stale := time.Since(s.loadedAt) > s.ttl
	s.mu.RUnlock()
	if stale {
		_ = s.Reload(ctx)
	}
}

// Get returns a decrypted config value.
func (s *Service) Get(ctx context.Context, key string) string {
	s.ensureFresh(ctx)
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.configs[key]
}

func (s *Service) ResendAPIKey(ctx context.Context) string { return s.Get(ctx, KeyResendAPIKey) }
func (s *Service) ResendFrom(ctx context.Context) string   { return s.Get(ctx, KeyResendFrom) }

// SiteConfig returns the public website settings.
func (s *Service) SiteConfig(ctx context.Context) SiteConfig {
	var imgs []string
	if raw := s.Get(ctx, KeySiteHeroImages); raw != "" {
		_ = json.Unmarshal([]byte(raw), &imgs)
	}
	return SiteConfig{
		Tagline:      s.Get(ctx, KeySiteTagline),
		ContactPhone: s.Get(ctx, KeySiteContactPhone),
		HeroImages:   imgs,
	}
}

// DefaultProvider returns the enabled default provider with a non-empty key.
func (s *Service) DefaultProvider(ctx context.Context) (Provider, bool) {
	s.ensureFresh(ctx)
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, p := range s.providers {
		if p.IsDefault && p.Enabled && strings.TrimSpace(p.APIKey) != "" {
			return p, true
		}
	}
	return Provider{}, false
}

// Providers returns a copy of the cached providers (keys included — callers must
// mask before serializing to clients).
func (s *Service) Providers(ctx context.Context) []Provider {
	s.ensureFresh(ctx)
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Provider, len(s.providers))
	copy(out, s.providers)
	return out
}

// --- writes (encrypt + persist + invalidate) ---

// SetConfig encrypts and upserts a config value, then reloads the cache.
func (s *Service) SetConfig(ctx context.Context, key, plaintext string, updatedBy uuid.UUID) error {
	meta, ok := metaFor(key)
	if !ok {
		meta = configMeta{Key: key, Category: CategoryGeneral, Secret: true}
	}
	enc, err := s.cipher.EncryptString(plaintext)
	if err != nil {
		return err
	}
	if err := s.repo.UpsertConfig(ctx, key, enc, meta.Secret, meta.Category, updatedBy); err != nil {
		return err
	}
	return s.Reload(ctx)
}

func (s *Service) CreateProvider(ctx context.Context, name, ptype, apiKey, model string, enabled bool) (uuid.UUID, error) {
	enc, err := s.cipher.EncryptString(apiKey)
	if err != nil {
		return uuid.Nil, err
	}
	id, err := s.repo.CreateProvider(ctx, name, ptype, enc, model, enabled)
	if err != nil {
		return uuid.Nil, err
	}
	return id, s.Reload(ctx)
}

// UpdateProvider updates a provider. An empty apiKey leaves the stored key intact.
func (s *Service) UpdateProvider(ctx context.Context, id uuid.UUID, model string, enabled bool, apiKey string) error {
	var enc []byte
	if strings.TrimSpace(apiKey) != "" {
		e, err := s.cipher.EncryptString(apiKey)
		if err != nil {
			return err
		}
		enc = e
	}
	if err := s.repo.UpdateProvider(ctx, id, model, enabled, enc); err != nil {
		return err
	}
	return s.Reload(ctx)
}

func (s *Service) SetDefaultProvider(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.SetDefault(ctx, id); err != nil {
		return err
	}
	return s.Reload(ctx)
}
