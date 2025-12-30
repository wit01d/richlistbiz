package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"richlistbiz/internal/models"
)

type WithdrawalRepository struct {
	pool *pgxpool.Pool
}

func NewWithdrawalRepository(pool *pgxpool.Pool) *WithdrawalRepository {
	return &WithdrawalRepository{pool: pool}
}

func (r *WithdrawalRepository) Create(ctx context.Context, userID uuid.UUID, amount float64, paymentMethod string) (*models.Withdrawal, error) {
	query := `
		INSERT INTO withdrawals (user_id, amount, currency, status, payment_method)
		VALUES ($1, $2, 'EUR', 'pending', $3)
		RETURNING id, user_id, amount, currency, status, payment_method, created_at, updated_at`

	var withdrawal models.Withdrawal
	err := r.pool.QueryRow(ctx, query, userID, amount, paymentMethod).Scan(
		&withdrawal.ID, &withdrawal.UserID, &withdrawal.Amount, &withdrawal.Currency,
		&withdrawal.Status, &withdrawal.PaymentMethod, &withdrawal.CreatedAt, &withdrawal.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create withdrawal: %w", err)
	}

	return &withdrawal, nil
}

func (r *WithdrawalRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Withdrawal, error) {
	query := `
		SELECT id, user_id, amount, currency, status, payment_method, payment_details,
			   processed_at, rejected_reason, created_at, updated_at
		FROM withdrawals WHERE id = $1`

	var withdrawal models.Withdrawal
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&withdrawal.ID, &withdrawal.UserID, &withdrawal.Amount, &withdrawal.Currency,
		&withdrawal.Status, &withdrawal.PaymentMethod, &withdrawal.PaymentDetails,
		&withdrawal.ProcessedAt, &withdrawal.RejectedReason, &withdrawal.CreatedAt, &withdrawal.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get withdrawal: %w", err)
	}

	return &withdrawal, nil
}

func (r *WithdrawalRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Withdrawal, error) {
	query := `
		SELECT id, user_id, amount, currency, status, payment_method, payment_details,
			   processed_at, rejected_reason, created_at, updated_at
		FROM withdrawals WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get withdrawals: %w", err)
	}
	defer rows.Close()

	var withdrawals []models.Withdrawal
	for rows.Next() {
		var withdrawal models.Withdrawal
		err := rows.Scan(
			&withdrawal.ID, &withdrawal.UserID, &withdrawal.Amount, &withdrawal.Currency,
			&withdrawal.Status, &withdrawal.PaymentMethod, &withdrawal.PaymentDetails,
			&withdrawal.ProcessedAt, &withdrawal.RejectedReason, &withdrawal.CreatedAt, &withdrawal.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan withdrawal: %w", err)
		}
		withdrawals = append(withdrawals, withdrawal)
	}

	return withdrawals, nil
}

func (r *WithdrawalRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.WithdrawalStatus, reason string) error {
	var query string
	var args []interface{}

	if status == models.WithdrawalStatusCompleted {
		query = `UPDATE withdrawals SET status = $2, processed_at = NOW() WHERE id = $1`
		args = []interface{}{id, status}
	} else if status == models.WithdrawalStatusRejected {
		query = `UPDATE withdrawals SET status = $2, rejected_reason = $3 WHERE id = $1`
		args = []interface{}{id, status, reason}
	} else {
		query = `UPDATE withdrawals SET status = $2 WHERE id = $1`
		args = []interface{}{id, status}
	}

	_, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update withdrawal status: %w", err)
	}
	return nil
}

func (r *WithdrawalRepository) GetPending(ctx context.Context, limit, offset int) ([]models.Withdrawal, int, error) {
	countQuery := `SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count withdrawals: %w", err)
	}

	query := `
		SELECT id, user_id, amount, currency, status, payment_method, payment_details,
			   processed_at, rejected_reason, created_at, updated_at
		FROM withdrawals WHERE status = 'pending'
		ORDER BY created_at ASC
		LIMIT $1 OFFSET $2`

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get pending withdrawals: %w", err)
	}
	defer rows.Close()

	var withdrawals []models.Withdrawal
	for rows.Next() {
		var withdrawal models.Withdrawal
		err := rows.Scan(
			&withdrawal.ID, &withdrawal.UserID, &withdrawal.Amount, &withdrawal.Currency,
			&withdrawal.Status, &withdrawal.PaymentMethod, &withdrawal.PaymentDetails,
			&withdrawal.ProcessedAt, &withdrawal.RejectedReason, &withdrawal.CreatedAt, &withdrawal.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan withdrawal: %w", err)
		}
		withdrawals = append(withdrawals, withdrawal)
	}

	return withdrawals, total, nil
}

func (r *WithdrawalRepository) Validate(ctx context.Context, userID uuid.UUID, amount float64) (bool, string, error) {
	query := `SELECT valid, reason FROM validate_withdrawal($1, $2)`

	var valid bool
	var reason *string
	err := r.pool.QueryRow(ctx, query, userID, amount).Scan(&valid, &reason)
	if err != nil {
		return false, "", fmt.Errorf("failed to validate withdrawal: %w", err)
	}

	reasonStr := ""
	if reason != nil {
		reasonStr = *reason
	}

	return valid, reasonStr, nil
}
