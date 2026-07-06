// Package plants persists the user's garden journal (Khu vườn): tracked plants
// and their check-in timeline. Previously client-side (localStorage); moving it
// here keys the data to the user so it is consistent across devices.
package plants

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

// CheckIn is one scan/re-check of a plant. JSON tags mirror the web client.
type CheckIn struct {
	ID      uuid.UUID       `json:"id"`
	At      time.Time       `json:"at"`
	Mode    string          `json:"mode"`
	Health  string          `json:"health"`
	Title   string          `json:"title"`
	Summary string          `json:"summary"`
	Note    *string         `json:"note"`
	Thumb   *string         `json:"thumb"`
	Result  json.RawMessage `json:"result,omitempty"`
}

// Plant is a tracked plant with its newest-first check-in timeline.
type Plant struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Species   *string   `json:"species"`
	Cover     *string   `json:"cover"`
	Health    string    `json:"health"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	CheckIns  []CheckIn `json:"check_ins"`
}

type Repo struct{ db *pgxpool.Pool }

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

const plantCols = `id, user_id, name, species, cover_url, health, created_at, updated_at`

func scanPlant(row pgx.Row) (*Plant, error) {
	var p Plant
	err := row.Scan(&p.ID, &p.UserID, &p.Name, &p.Species, &p.Cover, &p.Health, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.CheckIns = []CheckIn{}
	return &p, nil
}

// List returns the user's plants (each with its check-ins), most-recent first.
func (r *Repo) List(ctx context.Context, userID uuid.UUID) ([]Plant, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+plantCols+` FROM garden_plants
		  WHERE user_id=$1 AND deleted_at IS NULL
		  ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plants []Plant
	ids := []uuid.UUID{}
	for rows.Next() {
		p, err := scanPlant(rows)
		if err != nil {
			return nil, err
		}
		plants = append(plants, *p)
		ids = append(ids, p.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(plants) == 0 {
		return []Plant{}, nil
	}
	byPlant, err := r.checkInsFor(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range plants {
		if c, ok := byPlant[plants[i].ID]; ok {
			plants[i].CheckIns = c
		}
	}
	return plants, nil
}

// Get returns one plant (with check-ins) owned by userID.
func (r *Repo) Get(ctx context.Context, userID, id uuid.UUID) (*Plant, error) {
	p, err := scanPlant(r.db.QueryRow(ctx,
		`SELECT `+plantCols+` FROM garden_plants
		  WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`, id, userID))
	if err != nil {
		return nil, err
	}
	byPlant, err := r.checkInsFor(ctx, []uuid.UUID{id})
	if err != nil {
		return nil, err
	}
	if c, ok := byPlant[id]; ok {
		p.CheckIns = c
	}
	return p, nil
}

func (r *Repo) checkInsFor(ctx context.Context, plantIDs []uuid.UUID) (map[uuid.UUID][]CheckIn, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, plant_id, checked_at, mode, health, title, summary, note, thumb_url, result
		   FROM garden_check_ins
		  WHERE plant_id = ANY($1)
		  ORDER BY checked_at DESC`, plantIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[uuid.UUID][]CheckIn{}
	for rows.Next() {
		var plantID uuid.UUID
		var c CheckIn
		if err := rows.Scan(&c.ID, &plantID, &c.At, &c.Mode, &c.Health, &c.Title,
			&c.Summary, &c.Note, &c.Thumb, &c.Result); err != nil {
			return nil, err
		}
		out[plantID] = append(out[plantID], c)
	}
	return out, rows.Err()
}

// Create inserts a plant plus its first check-in atomically.
func (r *Repo) Create(ctx context.Context, userID uuid.UUID, name string, species, cover *string, first CheckIn) (*Plant, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	var id uuid.UUID
	if err := tx.QueryRow(ctx,
		`INSERT INTO garden_plants (user_id, name, species, cover_url, health)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		userID, name, species, cover, first.Health,
	).Scan(&id); err != nil {
		return nil, err
	}
	if err := insertCheckIn(ctx, tx, id, first); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, userID, id)
}

// AddCheckIn appends a check-in and refreshes the plant's health/cover.
func (r *Repo) AddCheckIn(ctx context.Context, userID, plantID uuid.UUID, ci CheckIn) (*Plant, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Ownership check + touch health/cover; COALESCE keeps an existing cover
	// when the new check-in has no thumbnail.
	ct, err := tx.Exec(ctx,
		`UPDATE garden_plants
		    SET health=$1, cover_url=COALESCE($2, cover_url), species=COALESCE(species,$3)
		  WHERE id=$4 AND user_id=$5 AND deleted_at IS NULL`,
		ci.Health, ci.Thumb, nzTitle(ci), plantID, userID)
	if err != nil {
		return nil, err
	}
	if ct.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	if err := insertCheckIn(ctx, tx, plantID, ci); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, userID, plantID)
}

func insertCheckIn(ctx context.Context, tx pgx.Tx, plantID uuid.UUID, ci CheckIn) error {
	var result any
	if len(ci.Result) > 0 {
		result = ci.Result // json.RawMessage → pgx JSON codec writes it as jsonb
	}
	_, err := tx.Exec(ctx,
		`INSERT INTO garden_check_ins (plant_id, mode, health, title, summary, note, thumb_url, result)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		plantID, ci.Mode, ci.Health, ci.Title, ci.Summary, ci.Note, ci.Thumb, result)
	return err
}

// Rename updates the plant's display name.
func (r *Repo) Rename(ctx context.Context, userID, id uuid.UUID, name string) (*Plant, error) {
	ct, err := r.db.Exec(ctx,
		`UPDATE garden_plants SET name=$1 WHERE id=$2 AND user_id=$3 AND deleted_at IS NULL`,
		name, id, userID)
	if err != nil {
		return nil, err
	}
	if ct.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return r.Get(ctx, userID, id)
}

// Delete soft-deletes a plant (and its check-ins cascade on hard delete only;
// soft-delete just hides it).
func (r *Repo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	ct, err := r.db.Exec(ctx,
		`UPDATE garden_plants SET deleted_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`,
		id, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// nzTitle is the species fallback for AddCheckIn: use the check-in title as a
// last-resort species label when the plant has none yet.
func nzTitle(ci CheckIn) *string {
	if ci.Title == "" {
		return nil
	}
	t := ci.Title
	return &t
}
