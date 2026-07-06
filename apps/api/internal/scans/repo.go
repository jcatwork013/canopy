// Package scans persists the user's recent scan history (lịch sử quét) so past
// results can be reopened without re-paying for AI — consistent across devices.
package scans

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

const maxPerUser = 30

// Item mirrors the web HistoryItem shape.
type Item struct {
	ID        uuid.UUID       `json:"id"`
	Mode      string          `json:"mode"`
	Title     string          `json:"title"`
	Thumb     *string         `json:"thumb"`
	Result    json.RawMessage `json:"result,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

// List returns the user's recent scans, newest first.
func (r *Repo) List(ctx context.Context, userID uuid.UUID) ([]Item, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, mode, title, thumb_url, result, created_at
		   FROM scan_history WHERE user_id=$1
		  ORDER BY created_at DESC LIMIT $2`, userID, maxPerUser)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Item{}
	for rows.Next() {
		var it Item
		if err := rows.Scan(&it.ID, &it.Mode, &it.Title, &it.Thumb, &it.Result, &it.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

// Add inserts a scan and trims the user's history to the newest maxPerUser.
func (r *Repo) Add(ctx context.Context, userID uuid.UUID, it Item) (*Item, error) {
	var result any
	if len(it.Result) > 0 {
		result = it.Result
	}
	var id uuid.UUID
	var createdAt time.Time
	if err := r.db.QueryRow(ctx,
		`INSERT INTO scan_history (user_id, mode, title, thumb_url, result)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
		userID, it.Mode, it.Title, it.Thumb, result,
	).Scan(&id, &createdAt); err != nil {
		return nil, err
	}
	// Keep history bounded per user.
	_, _ = r.db.Exec(ctx,
		`DELETE FROM scan_history WHERE user_id=$1 AND id NOT IN (
		   SELECT id FROM scan_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2)`,
		userID, maxPerUser)
	it.ID = id
	it.CreatedAt = createdAt
	return &it, nil
}

// Delete removes one scan owned by userID.
func (r *Repo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	ct, err := r.db.Exec(ctx, `DELETE FROM scan_history WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
