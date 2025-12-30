package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"richlistbiz/internal/models"
)

type AdminRepository struct {
	pool *pgxpool.Pool
}

func NewAdminRepository(pool *pgxpool.Pool) *AdminRepository {
	return &AdminRepository{pool: pool}
}

func (r *AdminRepository) GetSystemStats(ctx context.Context) (*models.SystemStats, error) {
	query := `SELECT * FROM v_system_stats`

	var stats models.SystemStats
	err := r.pool.QueryRow(ctx, query).Scan(
		&stats.TotalUsers,
		&stats.ActiveUsers,
		&stats.TotalDeposits,
		&stats.TotalDepositAmount,
		&stats.SystemBalance,
		&stats.SystemTotalCollected,
		&stats.TotalUserEarnings,
		&stats.TotalSuccessorNominations,
		&stats.UnresolvedFraudFlags,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get system stats: %w", err)
	}

	return &stats, nil
}

func (r *AdminRepository) GetFraudFlags(ctx context.Context, resolved bool, limit, offset int) ([]models.FraudFlag, int, error) {
	countQuery := `SELECT COUNT(*) FROM fraud_flags WHERE resolved = $1`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, resolved).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count fraud flags: %w", err)
	}

	query := `
		SELECT id, user_id, flag_type, severity, description, evidence,
			   resolved, resolved_at, resolved_by, resolution_notes, created_at
		FROM fraud_flags
		WHERE resolved = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.pool.Query(ctx, query, resolved, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get fraud flags: %w", err)
	}
	defer rows.Close()

	var flags []models.FraudFlag
	for rows.Next() {
		var flag models.FraudFlag
		err := rows.Scan(
			&flag.ID, &flag.UserID, &flag.FlagType, &flag.Severity, &flag.Description,
			&flag.Evidence, &flag.Resolved, &flag.ResolvedAt, &flag.ResolvedBy,
			&flag.ResolutionNotes, &flag.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan fraud flag: %w", err)
		}
		flags = append(flags, flag)
	}

	return flags, total, nil
}

func (r *AdminRepository) GetFraudFlagByID(ctx context.Context, id uuid.UUID) (*models.FraudFlag, error) {
	query := `
		SELECT id, user_id, flag_type, severity, description, evidence,
			   resolved, resolved_at, resolved_by, resolution_notes, created_at
		FROM fraud_flags WHERE id = $1`

	var flag models.FraudFlag
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&flag.ID, &flag.UserID, &flag.FlagType, &flag.Severity, &flag.Description,
		&flag.Evidence, &flag.Resolved, &flag.ResolvedAt, &flag.ResolvedBy,
		&flag.ResolutionNotes, &flag.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get fraud flag: %w", err)
	}

	return &flag, nil
}

func (r *AdminRepository) ResolveFraudFlag(ctx context.Context, id, resolvedBy uuid.UUID, notes string) error {
	query := `
		UPDATE fraud_flags
		SET resolved = TRUE, resolved_at = NOW(), resolved_by = $2, resolution_notes = $3
		WHERE id = $1`

	_, err := r.pool.Exec(ctx, query, id, resolvedBy, notes)
	if err != nil {
		return fmt.Errorf("failed to resolve fraud flag: %w", err)
	}
	return nil
}

func (r *AdminRepository) CreateFraudFlag(ctx context.Context, userID uuid.UUID, flagType string, severity models.FlagSeverity, description string) error {
	query := `
		INSERT INTO fraud_flags (user_id, flag_type, severity, description)
		VALUES ($1, $2, $3, $4)`

	_, err := r.pool.Exec(ctx, query, userID, flagType, severity, description)
	if err != nil {
		return fmt.Errorf("failed to create fraud flag: %w", err)
	}
	return nil
}
