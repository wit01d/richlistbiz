package handlers

import (
	"github.com/gofiber/fiber/v2"

	"richlistbiz/internal/middleware"
	"richlistbiz/internal/models"
	"richlistbiz/internal/services"
	"richlistbiz/pkg/response"
)

type UserHandler struct {
	authService     *services.AuthService
	referralService *services.ReferralService
}

func NewUserHandler(authService *services.AuthService, referralService *services.ReferralService) *UserHandler {
	return &UserHandler{
		authService:     authService,
		referralService: referralService,
	}
}

func (h *UserHandler) GetProfile(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	if claims == nil {
		return response.Unauthorized(c, "Invalid token")
	}

	user, err := h.authService.GetUserByKeycloakID(c.Context(), claims.Sub)
	if err != nil {
		return response.InternalError(c, "Failed to get user")
	}

	if user == nil {
		return response.NotFound(c, "User not found")
	}

	profile := models.UserProfile{
		ID:                      user.ID,
		Email:                   user.Email,
		Name:                    user.Name,
		ReferralCode:            user.ReferralCode,
		Status:                  user.Status,
		KYCVerified:             user.KYCVerified,
		Balance:                 user.Balance,
		TotalEarnings:           user.TotalEarnings,
		TotalWithdrawn:          user.TotalWithdrawn,
		DirectRecruitsCount:     user.DirectRecruitsCount,
		DepositingRecruitsCount: user.DepositingRecruitsCount,
		SuccessorNominated:      user.SuccessorNominated,
		CreatedAt:               user.CreatedAt,
	}

	return response.Success(c, profile)
}

func (h *UserHandler) ValidateReferralCode(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return response.BadRequest(c, "Referral code is required")
	}

	result, err := h.referralService.ValidateReferralCode(c.Context(), code)
	if err != nil {
		return response.InternalError(c, "Failed to validate referral code")
	}

	return response.Success(c, result)
}
