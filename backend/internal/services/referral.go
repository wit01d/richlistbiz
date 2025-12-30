package services

import (
	"context"

	"github.com/google/uuid"

	"richlistbiz/internal/models"
	"richlistbiz/internal/repository"
)

type ReferralService struct {
	userRepo     *repository.UserRepository
	listlineRepo *repository.ListlineRepository
	earningRepo  *repository.EarningRepository
}

func NewReferralService(
	userRepo *repository.UserRepository,
	listlineRepo *repository.ListlineRepository,
	earningRepo *repository.EarningRepository,
) *ReferralService {
	return &ReferralService{
		userRepo:     userRepo,
		listlineRepo: listlineRepo,
		earningRepo:  earningRepo,
	}
}

func (s *ReferralService) GetDashboardData(ctx context.Context, user *models.User) (*models.DashboardData, error) {
	stats, err := s.listlineRepo.GetStats(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	upline, err := s.userRepo.GetUplineChain(ctx, user.ID, 3)
	if err != nil {
		return nil, err
	}

	referrals, err := s.userRepo.GetDirectReferrals(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	payments, err := s.earningRepo.GetPayments(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	return &models.DashboardData{
		Username:      user.Name,
		ReferralCode:  user.ReferralCode,
		ListlineStats: *stats,
		Upline:        upline,
		Referrals:     referrals,
		Payments:      payments,
	}, nil
}

func (s *ReferralService) GetListlineStats(ctx context.Context, userID uuid.UUID) (*models.ListlineStats, error) {
	return s.listlineRepo.GetStats(ctx, userID)
}

func (s *ReferralService) GetListlineDetails(ctx context.Context, userID uuid.UUID) ([]models.ListlineDetail, error) {
	return s.listlineRepo.GetDetails(ctx, userID)
}

func (s *ReferralService) GetUplineChain(ctx context.Context, userID uuid.UUID, depth int) ([]string, error) {
	return s.userRepo.GetUplineChain(ctx, userID, depth)
}

func (s *ReferralService) GetDirectReferrals(ctx context.Context, userID uuid.UUID) ([]models.ReferralInfo, error) {
	return s.userRepo.GetDirectReferrals(ctx, userID)
}

func (s *ReferralService) ValidateReferralCode(ctx context.Context, code string) (*models.ValidationResult, error) {
	return s.userRepo.ValidateReferralLink(ctx, code)
}
