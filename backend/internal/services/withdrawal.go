package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"richlistbiz/internal/models"
	"richlistbiz/internal/repository"
)

type WithdrawalService struct {
	withdrawalRepo *repository.WithdrawalRepository
}

func NewWithdrawalService(withdrawalRepo *repository.WithdrawalRepository) *WithdrawalService {
	return &WithdrawalService{withdrawalRepo: withdrawalRepo}
}

func (s *WithdrawalService) RequestWithdrawal(ctx context.Context, userID uuid.UUID, amount float64, paymentMethod string) (*models.Withdrawal, error) {
	valid, reason, err := s.withdrawalRepo.Validate(ctx, userID, amount)
	if err != nil {
		return nil, fmt.Errorf("failed to validate withdrawal: %w", err)
	}

	if !valid {
		return nil, fmt.Errorf("withdrawal not allowed: %s", reason)
	}

	withdrawal, err := s.withdrawalRepo.Create(ctx, userID, amount, paymentMethod)
	if err != nil {
		return nil, fmt.Errorf("failed to create withdrawal: %w", err)
	}

	return withdrawal, nil
}

func (s *WithdrawalService) GetUserWithdrawals(ctx context.Context, userID uuid.UUID) ([]models.Withdrawal, error) {
	return s.withdrawalRepo.GetByUserID(ctx, userID)
}

func (s *WithdrawalService) GetWithdrawalByID(ctx context.Context, id uuid.UUID) (*models.Withdrawal, error) {
	return s.withdrawalRepo.GetByID(ctx, id)
}

func (s *WithdrawalService) GetPendingWithdrawals(ctx context.Context, limit, offset int) ([]models.Withdrawal, int, error) {
	return s.withdrawalRepo.GetPending(ctx, limit, offset)
}

func (s *WithdrawalService) ApproveWithdrawal(ctx context.Context, id uuid.UUID) error {
	withdrawal, err := s.withdrawalRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get withdrawal: %w", err)
	}

	if withdrawal == nil {
		return fmt.Errorf("withdrawal not found")
	}

	if withdrawal.Status != models.WithdrawalStatusPending {
		return fmt.Errorf("withdrawal is not pending")
	}

	return s.withdrawalRepo.UpdateStatus(ctx, id, models.WithdrawalStatusProcessing, "")
}

func (s *WithdrawalService) CompleteWithdrawal(ctx context.Context, id uuid.UUID) error {
	return s.withdrawalRepo.UpdateStatus(ctx, id, models.WithdrawalStatusCompleted, "")
}

func (s *WithdrawalService) RejectWithdrawal(ctx context.Context, id uuid.UUID, reason string) error {
	return s.withdrawalRepo.UpdateStatus(ctx, id, models.WithdrawalStatusRejected, reason)
}
