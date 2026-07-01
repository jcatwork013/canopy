package sysconfig

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ConfigRow struct {
	Key      string
	ValueEnc []byte
	IsSecret bool
	Category string
}

type ProviderRow struct {
	ID        uuid.UUID
	Name      string
	Type      string
	APIKeyEnc []byte
	Model     string
	Enabled   bool
	IsDefault bool
}

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

func (r *Repo) ListConfigs(ctx context.Context) ([]ConfigRow, error) {
	rows, err := r.db.Query(ctx,
		`SELECT key, value_enc, is_secret, COALESCE(category,'') FROM system_configs`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ConfigRow
	for rows.Next() {
		var c ConfigRow
		if err := rows.Scan(&c.Key, &c.ValueEnc, &c.IsSecret, &c.Category); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *Repo) UpsertConfig(ctx context.Context, key string, valueEnc []byte, isSecret bool, category string, updatedBy uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO system_configs (key, value_enc, is_secret, category, updated_by, updated_at)
		 VALUES ($1,$2,$3,$4,$5, now())
		 ON CONFLICT (key) DO UPDATE
		   SET value_enc = EXCLUDED.value_enc,
		       is_secret = EXCLUDED.is_secret,
		       category  = EXCLUDED.category,
		       updated_by = EXCLUDED.updated_by,
		       updated_at = now()`,
		key, valueEnc, isSecret, category, updatedBy)
	return err
}

func (r *Repo) ListProviders(ctx context.Context) ([]ProviderRow, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, type, api_key_enc, COALESCE(model,''), enabled, is_default
		   FROM ai_providers ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ProviderRow
	for rows.Next() {
		var p ProviderRow
		if err := rows.Scan(&p.ID, &p.Name, &p.Type, &p.APIKeyEnc, &p.Model, &p.Enabled, &p.IsDefault); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repo) CreateProvider(ctx context.Context, name, ptype string, keyEnc []byte, model string, enabled bool) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.QueryRow(ctx,
		`INSERT INTO ai_providers (name, type, api_key_enc, model, enabled)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		name, ptype, keyEnc, model, enabled).Scan(&id)
	return id, err
}

// UpdateProvider updates mutable fields. A nil keyEnc leaves the key unchanged.
func (r *Repo) UpdateProvider(ctx context.Context, id uuid.UUID, model string, enabled bool, keyEnc []byte) error {
	if keyEnc == nil {
		_, err := r.db.Exec(ctx,
			`UPDATE ai_providers SET model=$2, enabled=$3, updated_at=now() WHERE id=$1`,
			id, model, enabled)
		return err
	}
	_, err := r.db.Exec(ctx,
		`UPDATE ai_providers SET model=$2, enabled=$3, api_key_enc=$4, updated_at=now() WHERE id=$1`,
		id, model, enabled, keyEnc)
	return err
}

// SetDefault makes exactly one provider the default (atomically).
func (r *Repo) SetDefault(ctx context.Context, id uuid.UUID) error {
	return pgx.BeginFunc(ctx, r.db, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE ai_providers SET is_default=false WHERE is_default`); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `UPDATE ai_providers SET is_default=true, enabled=true WHERE id=$1`, id)
		return err
	})
}
