package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"richlistbiz/internal/models"
	"richlistbiz/internal/repository"
)

type AuthService struct {
	userRepo *repository.UserRepository
}

func NewAuthService(userRepo *repository.UserRepository) *AuthService {
	return &AuthService{userRepo: userRepo}
}

func (s *AuthService) GetOrCreateUser(ctx context.Context, claims *models.KeycloakClaims, referralCode string) (*models.User, bool, error) {
	user, err := s.userRepo.GetByKeycloakID(ctx, claims.Sub)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get user: %w", err)
	}

	if user != nil {
		if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
			return nil, false, fmt.Errorf("failed to update last login: %w", err)
		}
		return user, false, nil
	}

	var referrerID *uuid.UUID
	if referralCode != "" {
		validation, err := s.userRepo.ValidateReferralLink(ctx, referralCode)
		if err != nil {
			return nil, false, fmt.Errorf("failed to validate referral code: %w", err)
		}
		if !validation.Valid {
			return nil, false, fmt.Errorf("invalid referral code: %s", validation.Reason)
		}
		referrerID = validation.ReferrerID
	}

	name := claims.Name
	if name == "" {
		name = claims.PreferredUsername
	}
	if name == "" {
		name = claims.Email
	}

	user, err = s.userRepo.Create(ctx, claims.Sub, claims.Email, name, referrerID)
	if err != nil {
		return nil, false, fmt.Errorf("failed to create user: %w", err)
	}

	return user, true, nil
}

func (s *AuthService) GetUserByKeycloakID(ctx context.Context, keycloakID string) (*models.User, error) {
	return s.userRepo.GetByKeycloakID(ctx, keycloakID)
}

func (s *AuthService) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return s.userRepo.GetByID(ctx, id)
}
