// Package care persists AI-generated care roadmaps (phác đồ chăm sóc) and lets
// users tick off steps over time.
package care

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

// Step is one actionable item in a roadmap. JSON tags mirror packages/shared
// CarePlanStep so the web/mobile clients can consume it directly.
type Step struct {
	ID          uuid.UUID  `json:"id"`
	DayOffset   int        `json:"day_offset"`
	Sort        int        `json:"sort"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Category    string     `json:"category"`
	Amount      *string    `json:"amount"`
	CompletedAt *time.Time `json:"completed_at"`
}

// Plan mirrors packages/shared CarePlan.
type Plan struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	UserPlantID  *uuid.UUID `json:"user_plant_id"`
	Title        string     `json:"title"`
	PlantName    *string    `json:"plant_name"`
	Health       string     `json:"health"`
	Status       string     `json:"status"`
	Summary      string     `json:"summary"`
	Watering     *string    `json:"watering"`
	Fertilizer   *string    `json:"fertilizer"`
	Light        *string    `json:"light"`
	Prevention   *string    `json:"prevention"`
	WarningSigns []string   `json:"warning_signs"`
	DurationDays int        `json:"duration_days"`
	CoverURL     *string    `json:"cover_url"`
	Steps        []Step     `json:"steps"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

const planCols = `id, user_id, user_plant_id, title, plant_name, health, status, summary,
	watering, fertilizer, light, prevention, warning_signs, duration_days, cover_url,
	created_at, updated_at`

func scanPlan(row pgx.Row) (*Plan, error) {
	var p Plan
	err := row.Scan(&p.ID, &p.UserID, &p.UserPlantID, &p.Title, &p.PlantName, &p.Health, &p.Status,
		&p.Summary, &p.Watering, &p.Fertilizer, &p.Light, &p.Prevention, &p.WarningSigns,
		&p.DurationDays, &p.CoverURL, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if p.WarningSigns == nil {
		p.WarningSigns = []string{}
	}
	p.Steps = []Step{}
	return &p, nil
}

// Create inserts the plan and its steps atomically, then returns the full plan.
func (r *Repo) Create(ctx context.Context, p *Plan) (*Plan, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	var id uuid.UUID
	err = tx.QueryRow(ctx,
		`INSERT INTO care_plans
		   (user_id, user_plant_id, title, plant_name, health, status, summary,
		    watering, fertilizer, light, prevention, warning_signs, duration_days, cover_url)
		 VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10,$11,$12,$13)
		 RETURNING id`,
		p.UserID, p.UserPlantID, p.Title, p.PlantName, p.Health, p.Summary,
		p.Watering, p.Fertilizer, p.Light, p.Prevention, p.WarningSigns, p.DurationDays, p.CoverURL,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	for i, s := range p.Steps {
		if _, err := tx.Exec(ctx,
			`INSERT INTO care_plan_steps
			   (care_plan_id, day_offset, sort, title, description, category, amount)
			 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			id, s.DayOffset, i, s.Title, s.Description, s.Category, s.Amount,
		); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, p.UserID, id)
}

// List returns the user's active/most-recent plans (with steps), newest first.
func (r *Repo) List(ctx context.Context, userID uuid.UUID) ([]Plan, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+planCols+` FROM care_plans
		 WHERE user_id=$1 AND deleted_at IS NULL
		 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []Plan
	ids := []uuid.UUID{}
	for rows.Next() {
		p, err := scanPlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, *p)
		ids = append(ids, p.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(plans) == 0 {
		return []Plan{}, nil
	}

	steps, err := r.stepsFor(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range plans {
		if s, ok := steps[plans[i].ID]; ok {
			plans[i].Steps = s
		}
	}
	return plans, nil
}

// Get returns one plan (with steps) owned by userID.
func (r *Repo) Get(ctx context.Context, userID, id uuid.UUID) (*Plan, error) {
	p, err := scanPlan(r.db.QueryRow(ctx,
		`SELECT `+planCols+` FROM care_plans
		 WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`, id, userID))
	if err != nil {
		return nil, err
	}
	steps, err := r.stepsFor(ctx, []uuid.UUID{id})
	if err != nil {
		return nil, err
	}
	if s, ok := steps[id]; ok {
		p.Steps = s
	}
	return p, nil
}

func (r *Repo) stepsFor(ctx context.Context, planIDs []uuid.UUID) (map[uuid.UUID][]Step, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, care_plan_id, day_offset, sort, title, description, category, amount, completed_at
		   FROM care_plan_steps
		  WHERE care_plan_id = ANY($1)
		  ORDER BY day_offset, sort`, planIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[uuid.UUID][]Step{}
	for rows.Next() {
		var planID uuid.UUID
		var s Step
		if err := rows.Scan(&s.ID, &planID, &s.DayOffset, &s.Sort, &s.Title, &s.Description,
			&s.Category, &s.Amount, &s.CompletedAt); err != nil {
			return nil, err
		}
		out[planID] = append(out[planID], s)
	}
	return out, rows.Err()
}

// SetStatus updates a plan's lifecycle status and returns the refreshed plan.
func (r *Repo) SetStatus(ctx context.Context, userID, id uuid.UUID, status string) (*Plan, error) {
	ct, err := r.db.Exec(ctx,
		`UPDATE care_plans SET status=$1 WHERE id=$2 AND user_id=$3 AND deleted_at IS NULL`,
		status, id, userID)
	if err != nil {
		return nil, err
	}
	if ct.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return r.Get(ctx, userID, id)
}

// Delete soft-deletes a plan owned by userID.
func (r *Repo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	ct, err := r.db.Exec(ctx,
		`UPDATE care_plans SET deleted_at=now() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL`,
		id, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ToggleStep marks a step done/undone (ownership enforced via the plan join).
func (r *Repo) ToggleStep(ctx context.Context, userID, planID, stepID uuid.UUID, done bool) (*Step, error) {
	var completed any
	if done {
		completed = time.Now()
	}
	var s Step
	err := r.db.QueryRow(ctx,
		`UPDATE care_plan_steps st SET completed_at=$1
		   FROM care_plans p
		  WHERE st.id=$2 AND st.care_plan_id=$3 AND p.id=st.care_plan_id
		    AND p.user_id=$4 AND p.deleted_at IS NULL
		 RETURNING st.id, st.day_offset, st.sort, st.title, st.description, st.category, st.amount, st.completed_at`,
		completed, stepID, planID, userID,
	).Scan(&s.ID, &s.DayOffset, &s.Sort, &s.Title, &s.Description, &s.Category, &s.Amount, &s.CompletedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}
