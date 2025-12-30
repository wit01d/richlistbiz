package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"richlistbiz/internal/models"
)

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, COALESCE(metadata->>'keycloak_id', ''), email, name, referral_code, referrer_id,
			   status, kyc_verified, kyc_verified_at, balance, total_earnings, total_withdrawn,
			   direct_recruits_count, depositing_recruits_count, successor_nominated, successor_id,
			   last_login_at, last_activity_at, metadata, created_at, updated_at
		FROM users WHERE id = $1`

	var user models.User
	var keycloakID string
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &keycloakID, &user.Email, &user.Name, &user.ReferralCode, &user.ReferrerID,
		&user.Status, &user.KYCVerified, &user.KYCVerifiedAt, &user.Balance, &user.TotalEarnings, &user.TotalWithdrawn,
		&user.DirectRecruitsCount, &user.DepositingRecruitsCount, &user.SuccessorNominated, &user.SuccessorID,
		&user.LastLoginAt, &user.LastActivityAt, &user.Metadata, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}
	user.KeycloakID = keycloakID
	return &user, nil
}

func (r *UserRepository) GetByKeycloakID(ctx context.Context, keycloakID string) (*models.User, error) {
	query := `
		SELECT id, COALESCE(metadata->>'keycloak_id', ''), email, name, referral_code, referrer_id,
			   status, kyc_verified, kyc_verified_at, balance, total_earnings, total_withdrawn,
			   direct_recruits_count, depositing_recruits_count, successor_nominated, successor_id,
			   last_login_at, last_activity_at, metadata, created_at, updated_at
		FROM users WHERE metadata->>'keycloak_id' = $1`

	var user models.User
	var kcID string
	err := r.pool.QueryRow(ctx, query, keycloakID).Scan(
		&user.ID, &kcID, &user.Email, &user.Name, &user.ReferralCode, &user.ReferrerID,
		&user.Status, &user.KYCVerified, &user.KYCVerifiedAt, &user.Balance, &user.TotalEarnings, &user.TotalWithdrawn,
		&user.DirectRecruitsCount, &user.DepositingRecruitsCount, &user.SuccessorNominated, &user.SuccessorID,
		&user.LastLoginAt, &user.LastActivityAt, &user.Metadata, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by Keycloak ID: %w", err)
	}
	user.KeycloakID = kcID
	return &user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, COALESCE(metadata->>'keycloak_id', ''), email, name, referral_code, referrer_id,
			   status, kyc_verified, kyc_verified_at, balance, total_earnings, total_withdrawn,
			   direct_recruits_count, depositing_recruits_count, successor_nominated, successor_id,
			   last_login_at, last_activity_at, metadata, created_at, updated_at
		FROM users WHERE email = $1`

	var user models.User
	var keycloakID string
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &keycloakID, &user.Email, &user.Name, &user.ReferralCode, &user.ReferrerID,
		&user.Status, &user.KYCVerified, &user.KYCVerifiedAt, &user.Balance, &user.TotalEarnings, &user.TotalWithdrawn,
		&user.DirectRecruitsCount, &user.DepositingRecruitsCount, &user.SuccessorNominated, &user.SuccessorID,
		&user.LastLoginAt, &user.LastActivityAt, &user.Metadata, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	user.KeycloakID = keycloakID
	return &user, nil
}

func (r *UserRepository) GetByReferralCode(ctx context.Context, code string) (*models.User, error) {
	query := `
		SELECT id, COALESCE(metadata->>'keycloak_id', ''), email, name, referral_code, referrer_id,
			   status, kyc_verified, kyc_verified_at, balance, total_earnings, total_withdrawn,
			   direct_recruits_count, depositing_recruits_count, successor_nominated, successor_id,
			   last_login_at, last_activity_at, metadata, created_at, updated_at
		FROM users WHERE referral_code = $1`

	var user models.User
	var keycloakID string
	err := r.pool.QueryRow(ctx, query, code).Scan(
		&user.ID, &keycloakID, &user.Email, &user.Name, &user.ReferralCode, &user.ReferrerID,
		&user.Status, &user.KYCVerified, &user.KYCVerifiedAt, &user.Balance, &user.TotalEarnings, &user.TotalWithdrawn,
		&user.DirectRecruitsCount, &user.DepositingRecruitsCount, &user.SuccessorNominated, &user.SuccessorID,
		&user.LastLoginAt, &user.LastActivityAt, &user.Metadata, &user.CreatedAt, &user.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by referral code: %w", err)
	}
	user.KeycloakID = keycloakID
	return &user, nil
}

func (r *UserRepository) Create(ctx context.Context, keycloakID, email, name string, referrerID *uuid.UUID) (*models.User, error) {
	var referralCode string
	err := r.pool.QueryRow(ctx, "SELECT generate_referral_code()").Scan(&referralCode)
	if err != nil {
		return nil, fmt.Errorf("failed to generate referral code: %w", err)
	}

	query := `
		INSERT INTO users (email, name, password_hash, referral_code, referrer_id, status, metadata)
		VALUES ($1, $2, 'KEYCLOAK_AUTH', $3, $4, 'active', jsonb_build_object('keycloak_id', $5))
		RETURNING id, created_at, updated_at`

	var user models.User
	err = r.pool.QueryRow(ctx, query, email, name, referralCode, referrerID, keycloakID).Scan(
		&user.ID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	user.KeycloakID = keycloakID
	user.Email = email
	user.Name = name
	user.ReferralCode = referralCode
	user.ReferrerID = referrerID
	user.Status = models.UserStatusActive

	return &user, nil
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE users SET last_login_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

func (r *UserRepository) GetDirectReferrals(ctx context.Context, userID uuid.UUID) ([]models.ReferralInfo, error) {
	query := `
		SELECT u.id, u.name, u.created_at,
			   EXISTS(SELECT 1 FROM deposits d WHERE d.user_id = u.id AND d.status = 'cleared') AS paid
		FROM users u
		WHERE u.referrer_id = $1
		ORDER BY u.created_at DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get direct referrals: %w", err)
	}
	defer rows.Close()

	var referrals []models.ReferralInfo
	for rows.Next() {
		var id uuid.UUID
		var name string
		var createdAt time.Time
		var paid bool

		if err := rows.Scan(&id, &name, &createdAt, &paid); err != nil {
			return nil, fmt.Errorf("failed to scan referral: %w", err)
		}

		referrals = append(referrals, models.ReferralInfo{
			ID:       id.String(),
			Username: name,
			Date:     createdAt.Format("2006-01-02"),
			Paid:     paid,
		})
	}

	return referrals, nil
}

func (r *UserRepository) GetUplineChain(ctx context.Context, userID uuid.UUID, depth int) ([]string, error) {
	query := `SELECT user_name FROM get_upline_chain($1, $2) WHERE level > 1 ORDER BY level ASC`

	rows, err := r.pool.Query(ctx, query, userID, depth+1)
	if err != nil {
		return nil, fmt.Errorf("failed to get upline chain: %w", err)
	}
	defer rows.Close()

	var upline []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("failed to scan upline: %w", err)
		}
		upline = append(upline, name)
	}

	return upline, nil
}

func (r *UserRepository) ListAll(ctx context.Context, limit, offset int) ([]models.User, int, error) {
	countQuery := `SELECT COUNT(*) FROM users WHERE id != '00000000-0000-0000-0000-000000000000'`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	query := `
		SELECT id, COALESCE(metadata->>'keycloak_id', ''), email, name, referral_code, referrer_id,
			   status, kyc_verified, kyc_verified_at, balance, total_earnings, total_withdrawn,
			   direct_recruits_count, depositing_recruits_count, successor_nominated, successor_id,
			   last_login_at, last_activity_at, metadata, created_at, updated_at
		FROM users
		WHERE id != '00000000-0000-0000-0000-000000000000'
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var keycloakID string
		err := rows.Scan(
			&user.ID, &keycloakID, &user.Email, &user.Name, &user.ReferralCode, &user.ReferrerID,
			&user.Status, &user.KYCVerified, &user.KYCVerifiedAt, &user.Balance, &user.TotalEarnings, &user.TotalWithdrawn,
			&user.DirectRecruitsCount, &user.DepositingRecruitsCount, &user.SuccessorNominated, &user.SuccessorID,
			&user.LastLoginAt, &user.LastActivityAt, &user.Metadata, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}
		user.KeycloakID = keycloakID
		users = append(users, user)
	}

	return users, total, nil
}

func (r *UserRepository) ValidateReferralLink(ctx context.Context, code string) (*models.ValidationResult, error) {
	query := `SELECT valid, referrer_id, reason FROM validate_referral_link($1)`

	var result models.ValidationResult
	err := r.pool.QueryRow(ctx, query, code).Scan(&result.Valid, &result.ReferrerID, &result.Reason)
	if err != nil {
		return nil, fmt.Errorf("failed to validate referral link: %w", err)
	}

	return &result, nil
}
