package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"richlistbiz/internal/models"
)

type DepositRepository struct {
	pool *pgxpool.Pool
}

func NewDepositRepository(pool *pgxpool.Pool) *DepositRepository {
	return &DepositRepository{pool: pool}
}

func (r *DepositRepository) Create(ctx context.Context, userID uuid.UUID, paymentProcessor, paymentReference string) (*models.Deposit, error) {
	query := `
		INSERT INTO deposits (user_id, amount, currency, status, payment_processor, payment_reference)
		VALUES ($1, 10.00, 'EUR', 'pending', $2, $3)
		RETURNING id, user_id, amount, currency, status, payment_processor, payment_reference,
				  listline_id, recipient_user_id, recipient_is_system, created_at, updated_at`

	var deposit models.Deposit
	err := r.pool.QueryRow(ctx, query, userID, paymentProcessor, paymentReference).Scan(
		&deposit.ID, &deposit.UserID, &deposit.Amount, &deposit.Currency, &deposit.Status,
		&deposit.PaymentProcessor, &deposit.PaymentReference,
		&deposit.ListlineID, &deposit.RecipientUserID, &deposit.RecipientIsSystem,
		&deposit.CreatedAt, &deposit.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create deposit: %w", err)
	}

	return &deposit, nil
}

func (r *DepositRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Deposit, error) {
	query := `
		SELECT id, user_id, amount, currency, status, payment_processor, payment_reference,
			   listline_id, recipient_user_id, recipient_is_system, cleared_at, refunded_at,
			   chargeback_at, metadata, created_at, updated_at
		FROM deposits WHERE id = $1`

	var deposit models.Deposit
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&deposit.ID, &deposit.UserID, &deposit.Amount, &deposit.Currency, &deposit.Status,
		&deposit.PaymentProcessor, &deposit.PaymentReference,
		&deposit.ListlineID, &deposit.RecipientUserID, &deposit.RecipientIsSystem,
		&deposit.ClearedAt, &deposit.RefundedAt, &deposit.ChargebackAt,
		&deposit.Metadata, &deposit.CreatedAt, &deposit.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get deposit: %w", err)
	}

	return &deposit, nil
}

func (r *DepositRepository) GetByPaymentReference(ctx context.Context, reference string) (*models.Deposit, error) {
	query := `
		SELECT id, user_id, amount, currency, status, payment_processor, payment_reference,
			   listline_id, recipient_user_id, recipient_is_system, cleared_at, refunded_at,
			   chargeback_at, metadata, created_at, updated_at
		FROM deposits WHERE payment_reference = $1`

	var deposit models.Deposit
	err := r.pool.QueryRow(ctx, query, reference).Scan(
		&deposit.ID, &deposit.UserID, &deposit.Amount, &deposit.Currency, &deposit.Status,
		&deposit.PaymentProcessor, &deposit.PaymentReference,
		&deposit.ListlineID, &deposit.RecipientUserID, &deposit.RecipientIsSystem,
		&deposit.ClearedAt, &deposit.RefundedAt, &deposit.ChargebackAt,
		&deposit.Metadata, &deposit.CreatedAt, &deposit.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get deposit by reference: %w", err)
	}

	return &deposit, nil
}

func (r *DepositRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.DepositStatus) error {
	query := `UPDATE deposits SET status = $2 WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id, status)
	if err != nil {
		return fmt.Errorf("failed to update deposit status: %w", err)
	}
	return nil
}

func (r *DepositRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Deposit, error) {
	query := `
		SELECT id, user_id, amount, currency, status, payment_processor, payment_reference,
			   listline_id, recipient_user_id, recipient_is_system, cleared_at, refunded_at,
			   chargeback_at, metadata, created_at, updated_at
		FROM deposits WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get deposits: %w", err)
	}
	defer rows.Close()

	var deposits []models.Deposit
	for rows.Next() {
		var deposit models.Deposit
		err := rows.Scan(
			&deposit.ID, &deposit.UserID, &deposit.Amount, &deposit.Currency, &deposit.Status,
			&deposit.PaymentProcessor, &deposit.PaymentReference,
			&deposit.ListlineID, &deposit.RecipientUserID, &deposit.RecipientIsSystem,
			&deposit.ClearedAt, &deposit.RefundedAt, &deposit.ChargebackAt,
			&deposit.Metadata, &deposit.CreatedAt, &deposit.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan deposit: %w", err)
		}
		deposits = append(deposits, deposit)
	}

	return deposits, nil
}

func (r *DepositRepository) HasClearedDeposit(ctx context.Context, userID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM deposits WHERE user_id = $1 AND status = 'cleared')`

	var exists bool
	err := r.pool.QueryRow(ctx, query, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check deposit: %w", err)
	}

	return exists, nil
}
