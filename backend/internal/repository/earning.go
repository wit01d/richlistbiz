package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"richlistbiz/internal/models"
)

type EarningRepository struct {
	pool *pgxpool.Pool
}

func NewEarningRepository(pool *pgxpool.Pool) *EarningRepository {
	return &EarningRepository{pool: pool}
}

func (r *EarningRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Earning, error) {
	query := `
		SELECT id, user_id, is_system_earning, amount, earning_type, source_user_id,
			   deposit_id, status, verified_at, cleared_at, created_at
		FROM earnings
		WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get earnings: %w", err)
	}
	defer rows.Close()

	var earnings []models.Earning
	for rows.Next() {
		var earning models.Earning
		err := rows.Scan(
			&earning.ID, &earning.UserID, &earning.IsSystemEarning, &earning.Amount,
			&earning.EarningType, &earning.SourceUserID, &earning.DepositID,
			&earning.Status, &earning.VerifiedAt, &earning.ClearedAt, &earning.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan earning: %w", err)
		}
		earnings = append(earnings, earning)
	}

	return earnings, nil
}

func (r *EarningRepository) GetPayments(ctx context.Context, userID uuid.UUID) ([]models.PaymentInfo, error) {
	query := `
		SELECT e.id, u.name, e.amount, e.created_at
		FROM earnings e
		JOIN users u ON e.source_user_id = u.id
		WHERE e.user_id = $1 AND e.status = 'cleared'
		ORDER BY e.created_at DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get payments: %w", err)
	}
	defer rows.Close()

	const maintenanceFee = 0.10
	var payments []models.PaymentInfo
	for rows.Next() {
		var id uuid.UUID
		var fromName string
		var amount float64
		var createdAt time.Time

		err := rows.Scan(&id, &fromName, &amount, &createdAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan payment: %w", err)
		}

		payments = append(payments, models.PaymentInfo{
			ID:        id.String(),
			From:      fromName,
			Amount:    amount,
			NetAmount: amount * (1 - maintenanceFee),
			Date:      createdAt.Format("2006-01-02"),
		})
	}

	return payments, nil
}

func (r *EarningRepository) GetSummary(ctx context.Context, userID uuid.UUID) (pending, verified, cleared float64, err error) {
	query := `
		SELECT
			COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending,
			COALESCE(SUM(CASE WHEN status = 'verified' THEN amount ELSE 0 END), 0) AS verified,
			COALESCE(SUM(CASE WHEN status = 'cleared' THEN amount ELSE 0 END), 0) AS cleared
		FROM earnings
		WHERE user_id = $1 AND is_system_earning = FALSE`

	err = r.pool.QueryRow(ctx, query, userID).Scan(&pending, &verified, &cleared)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to get earnings summary: %w", err)
	}

	return pending, verified, cleared, nil
}
