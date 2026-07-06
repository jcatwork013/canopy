// Package profile persists user display preferences (name, avatar, banner) so
// they are consistent across devices instead of living in per-device storage.
package profile

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Prefs mirrors the web ProfilePrefs shape. Images are stored as data URLs.
type Prefs struct {
	Name   *string `json:"name"`
	Avatar *string `json:"avatar"`
	Banner *string `json:"banner"`
}

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

// Get returns the user's prefs (all-nil if they have none yet).
func (r *Repo) Get(ctx context.Context, userID uuid.UUID) (Prefs, error) {
	var p Prefs
	err := r.db.QueryRow(ctx,
		`SELECT name, avatar_url, banner_url FROM user_profiles WHERE user_id=$1`, userID).
		Scan(&p.Name, &p.Avatar, &p.Banner)
	if err == pgx.ErrNoRows {
		return Prefs{}, nil
	}
	if err != nil {
		return Prefs{}, err
	}
	return p, nil
}

// Update upserts the provided fields (nil = leave unchanged) and returns the
// full, refreshed prefs.
func (r *Repo) Update(ctx context.Context, userID uuid.UUID, patch Prefs) (Prefs, error) {
	if _, err := r.db.Exec(ctx,
		`INSERT INTO user_profiles (user_id, name, avatar_url, banner_url)
		 VALUES ($1,$2,$3,$4)
		 ON CONFLICT (user_id) DO UPDATE SET
		   name       = COALESCE($2, user_profiles.name),
		   avatar_url = COALESCE($3, user_profiles.avatar_url),
		   banner_url = COALESCE($4, user_profiles.banner_url)`,
		userID, patch.Name, patch.Avatar, patch.Banner); err != nil {
		return Prefs{}, err
	}
	return r.Get(ctx, userID)
}
