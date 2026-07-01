// Package kyc handles identity verification submissions and the seller/caretaker
// role applications they carry. An admin reviews each submission and, on approval,
// the requested roles are granted and the user's kyc_status becomes 'verified'.
package kyc

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound = errors.New("not found")
	ErrPending  = errors.New("đã có hồ sơ đang chờ duyệt")
)

// Submission mirrors a row of kyc_submissions (+ joined user fields for admin).
type Submission struct {
	ID                 uuid.UUID
	UserID             uuid.UUID
	DocumentType       string
	DocumentNumber     *string
	DocumentFrontKey   string
	DocumentBackKey    *string
	SelfieKey          *string
	RequestedSeller    bool
	RequestedCaretaker bool
	Status             string
	RejectionReason    *string
	ReviewedAt         *time.Time
	CreatedAt          time.Time

	// Joined (admin listing only).
	UserEmail    string
	UserFullName string
}

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo { return &Repo{db: db} }

// Create inserts a submission and flips the user's kyc_status to 'submitted'.
// Rejects if the user already has a pending (submitted/in_review) submission.
func (r *Repo) Create(ctx context.Context, s *Submission) (uuid.UUID, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var pending bool
	if err := tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM kyc_submissions
		   WHERE user_id=$1 AND status IN ('submitted','in_review'))`, s.UserID).Scan(&pending); err != nil {
		return uuid.Nil, err
	}
	if pending {
		return uuid.Nil, ErrPending
	}

	var id uuid.UUID
	if err := tx.QueryRow(ctx,
		`INSERT INTO kyc_submissions
		   (user_id, document_type, document_number, document_front_url, document_back_url,
		    selfie_url, requested_seller, requested_caretaker, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'submitted')
		 RETURNING id`,
		s.UserID, s.DocumentType, s.DocumentNumber, s.DocumentFrontKey, s.DocumentBackKey,
		s.SelfieKey, s.RequestedSeller, s.RequestedCaretaker,
	).Scan(&id); err != nil {
		return uuid.Nil, err
	}

	// Don't downgrade an already-verified user who is applying for an extra role —
	// that would temporarily strip their existing seller/caretaker capability.
	if _, err := tx.Exec(ctx,
		`UPDATE users SET kyc_status='submitted' WHERE id=$1 AND kyc_status <> 'verified'`,
		s.UserID); err != nil {
		return uuid.Nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, err
	}
	return id, nil
}

const subCols = `id, user_id, document_type, document_number, document_front_url, document_back_url,
	selfie_url, requested_seller, requested_caretaker, status, rejection_reason, reviewed_at, created_at`

func scanSub(row pgx.Row) (*Submission, error) {
	var s Submission
	err := row.Scan(&s.ID, &s.UserID, &s.DocumentType, &s.DocumentNumber, &s.DocumentFrontKey,
		&s.DocumentBackKey, &s.SelfieKey, &s.RequestedSeller, &s.RequestedCaretaker, &s.Status,
		&s.RejectionReason, &s.ReviewedAt, &s.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &s, err
}

// LatestByUser returns the user's most recent submission (ErrNotFound if none).
func (r *Repo) LatestByUser(ctx context.Context, userID uuid.UUID) (*Submission, error) {
	return scanSub(r.db.QueryRow(ctx,
		`SELECT `+subCols+` FROM kyc_submissions
		 WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, userID))
}

// GetByID returns one submission by id.
func (r *Repo) GetByID(ctx context.Context, id uuid.UUID) (*Submission, error) {
	return scanSub(r.db.QueryRow(ctx,
		`SELECT `+subCols+` FROM kyc_submissions WHERE id=$1`, id))
}

// List returns submissions filtered by status (empty status = pending queue),
// joined with the applicant's name/email, newest first.
func (r *Repo) List(ctx context.Context, status string) ([]Submission, error) {
	q := `SELECT k.id, k.user_id, k.document_type, k.document_number, k.document_front_url,
	       k.document_back_url, k.selfie_url, k.requested_seller, k.requested_caretaker,
	       k.status, k.rejection_reason, k.reviewed_at, k.created_at, u.email, u.full_name
	     FROM kyc_submissions k JOIN users u ON u.id = k.user_id`
	var rows pgx.Rows
	var err error
	if status == "" {
		q += ` WHERE k.status IN ('submitted','in_review') ORDER BY k.created_at ASC`
		rows, err = r.db.Query(ctx, q)
	} else {
		q += ` WHERE k.status=$1 ORDER BY k.created_at DESC`
		rows, err = r.db.Query(ctx, q, status)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Submission{}
	for rows.Next() {
		var s Submission
		if err := rows.Scan(&s.ID, &s.UserID, &s.DocumentType, &s.DocumentNumber, &s.DocumentFrontKey,
			&s.DocumentBackKey, &s.SelfieKey, &s.RequestedSeller, &s.RequestedCaretaker, &s.Status,
			&s.RejectionReason, &s.ReviewedAt, &s.CreatedAt, &s.UserEmail, &s.UserFullName); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// Approve marks the submission verified and grants the requested roles to the user
// (kyc_status='verified'), all in one transaction.
func (r *Repo) Approve(ctx context.Context, id, adminID uuid.UUID) error {
	return r.review(ctx, id, adminID, true, "")
}

// Reject marks the submission rejected with a reason; the user's kyc returns to
// 'rejected' so they can resubmit.
func (r *Repo) Reject(ctx context.Context, id, adminID uuid.UUID, reason string) error {
	return r.review(ctx, id, adminID, false, reason)
}

func (r *Repo) review(ctx context.Context, id, adminID uuid.UUID, approve bool, reason string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var userID uuid.UUID
	var reqSeller, reqCaretaker bool
	var status string
	err = tx.QueryRow(ctx,
		`SELECT user_id, requested_seller, requested_caretaker, status
		   FROM kyc_submissions WHERE id=$1 FOR UPDATE`, id,
	).Scan(&userID, &reqSeller, &reqCaretaker, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	if approve {
		if _, err := tx.Exec(ctx,
			`UPDATE kyc_submissions
			   SET status='verified', reviewed_by=$2, reviewed_at=now(), rejection_reason=NULL
			 WHERE id=$1`, id, adminID); err != nil {
			return err
		}
		// Grant requested roles additively; never revoke an existing role.
		if _, err := tx.Exec(ctx,
			`UPDATE users
			   SET kyc_status='verified',
			       is_seller    = is_seller    OR $2,
			       is_caretaker = is_caretaker OR $3
			 WHERE id=$1`, userID, reqSeller, reqCaretaker); err != nil {
			return err
		}
	} else {
		if _, err := tx.Exec(ctx,
			`UPDATE kyc_submissions
			   SET status='rejected', reviewed_by=$2, reviewed_at=now(), rejection_reason=$3
			 WHERE id=$1`, id, adminID, reason); err != nil {
			return err
		}
		// Same guard: rejecting an extra-role application must not revoke a user's
		// already-verified identity.
		if _, err := tx.Exec(ctx,
			`UPDATE users SET kyc_status='rejected' WHERE id=$1 AND kyc_status <> 'verified'`,
			userID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
