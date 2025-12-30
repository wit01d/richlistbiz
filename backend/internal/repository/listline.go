package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"richlistbiz/internal/models"
)

type ListlineRepository struct {
	pool *pgxpool.Pool
}

func NewListlineRepository(pool *pgxpool.Pool) *ListlineRepository {
	return &ListlineRepository{pool: pool}
}

func (r *ListlineRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.Listline, error) {
	query := `
		SELECT id, user_id, position_1_user_id, position_1_is_system,
			   position_2_user_id, position_2_is_system,
			   position_3_user_id, position_3_is_system,
			   position_4_user_id, is_successor_listline, original_referrer_id, created_at
		FROM listlines
		WHERE user_id = $1 AND is_successor_listline = FALSE
		ORDER BY created_at DESC
		LIMIT 1`

	var listline models.Listline
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&listline.ID, &listline.UserID,
		&listline.Position1UserID, &listline.Position1IsSystem,
		&listline.Position2UserID, &listline.Position2IsSystem,
		&listline.Position3UserID, &listline.Position3IsSystem,
		&listline.Position4UserID, &listline.IsSuccessorListline,
		&listline.OriginalReferrerID, &listline.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get listline: %w", err)
	}

	return &listline, nil
}

func (r *ListlineRepository) GetStats(ctx context.Context, userID uuid.UUID) (*models.ListlineStats, error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE position_1_user_id = $1 AND NOT position_1_is_system) AS p1_count,
			COUNT(*) FILTER (WHERE position_2_user_id = $1 AND NOT position_2_is_system) AS p2_count,
			COUNT(*) FILTER (WHERE position_3_user_id = $1 AND NOT position_3_is_system) AS p3_count,
			COUNT(*) FILTER (WHERE position_4_user_id = $1) AS p4_count
		FROM listlines`

	var stats models.ListlineStats
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&stats.Position1Count,
		&stats.Position2Count,
		&stats.Position3Count,
		&stats.Position4Count,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get listline stats: %w", err)
	}

	earningsQuery := `
		SELECT COALESCE(SUM(amount), 0)
		FROM earnings
		WHERE user_id = $1 AND earning_type = 'deposit' AND status = 'cleared'`

	err = r.pool.QueryRow(ctx, earningsQuery, userID).Scan(&stats.TotalEarningsFromPosition1)
	if err != nil {
		return nil, fmt.Errorf("failed to get earnings: %w", err)
	}

	return &stats, nil
}

func (r *ListlineRepository) GetDetails(ctx context.Context, userID uuid.UUID) ([]models.ListlineDetail, error) {
	query := `
		SELECT
			l.position_1_user_id, l.position_1_is_system, COALESCE(u1.name, 'SYSTEM') AS p1_name,
			l.position_2_user_id, l.position_2_is_system, COALESCE(u2.name, 'SYSTEM') AS p2_name,
			l.position_3_user_id, l.position_3_is_system, COALESCE(u3.name, 'SYSTEM') AS p3_name,
			l.position_4_user_id, u4.name AS p4_name
		FROM listlines l
		LEFT JOIN users u1 ON l.position_1_user_id = u1.id
		LEFT JOIN users u2 ON l.position_2_user_id = u2.id
		LEFT JOIN users u3 ON l.position_3_user_id = u3.id
		JOIN users u4 ON l.position_4_user_id = u4.id
		WHERE l.user_id = $1 AND l.is_successor_listline = FALSE
		ORDER BY l.created_at DESC
		LIMIT 1`

	var p1ID, p2ID, p3ID, p4ID *uuid.UUID
	var p1System, p2System, p3System bool
	var p1Name, p2Name, p3Name, p4Name string

	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&p1ID, &p1System, &p1Name,
		&p2ID, &p2System, &p2Name,
		&p3ID, &p3System, &p3Name,
		&p4ID, &p4Name,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get listline details: %w", err)
	}

	details := []models.ListlineDetail{
		{
			Position: 1,
			UserID:   uuidToString(p1ID),
			UserName: p1Name,
			IsSystem: p1System,
		},
		{
			Position: 2,
			UserID:   uuidToString(p2ID),
			UserName: p2Name,
			IsSystem: p2System,
		},
		{
			Position: 3,
			UserID:   uuidToString(p3ID),
			UserName: p3Name,
			IsSystem: p3System,
		},
		{
			Position: 4,
			UserID:   uuidToString(p4ID),
			UserName: p4Name,
			IsSystem: false,
		},
	}

	return details, nil
}

func uuidToString(id *uuid.UUID) string {
	if id == nil {
		return ""
	}
	return id.String()
}
