package handlers

import (
	"github.com/gofiber/fiber/v2"

	"richlistbiz/internal/middleware"
	"richlistbiz/internal/services"
	"richlistbiz/pkg/response"
)

type WithdrawalHandler struct {
	authService       *services.AuthService
	withdrawalService *services.WithdrawalService
}

func NewWithdrawalHandler(authService *services.AuthService, withdrawalService *services.WithdrawalService) *WithdrawalHandler {
	return &WithdrawalHandler{
		authService:       authService,
		withdrawalService: withdrawalService,
	}
}

type RequestWithdrawalInput struct {
	Amount        float64 `json:"amount"`
	PaymentMethod string  `json:"payment_method"`
}

func (h *WithdrawalHandler) RequestWithdrawal(c *fiber.Ctx) error {
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

	var input RequestWithdrawalInput
	if err := c.BodyParser(&input); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if input.Amount < 10 {
		return response.BadRequest(c, "Minimum withdrawal amount is €10")
	}

	if input.PaymentMethod == "" {
		return response.BadRequest(c, "Payment method is required")
	}

	withdrawal, err := h.withdrawalService.RequestWithdrawal(c.Context(), user.ID, input.Amount, input.PaymentMethod)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	return response.Created(c, withdrawal)
}

func (h *WithdrawalHandler) GetWithdrawals(c *fiber.Ctx) error {
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

	withdrawals, err := h.withdrawalService.GetUserWithdrawals(c.Context(), user.ID)
	if err != nil {
		return response.InternalError(c, "Failed to get withdrawals")
	}

	return response.Success(c, withdrawals)
}
