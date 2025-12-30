package handlers

import (
	"io"

	"github.com/gofiber/fiber/v2"

	"richlistbiz/internal/middleware"
	"richlistbiz/internal/services"
	"richlistbiz/pkg/response"
)

type DepositHandler struct {
	authService    *services.AuthService
	paymentService *services.PaymentService
}

func NewDepositHandler(authService *services.AuthService, paymentService *services.PaymentService) *DepositHandler {
	return &DepositHandler{
		authService:    authService,
		paymentService: paymentService,
	}
}

type CreateDepositInput struct {
	SuccessURL string `json:"success_url"`
	CancelURL  string `json:"cancel_url"`
}

func (h *DepositHandler) CreateCheckout(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	if claims == nil {
		return response.Unauthorized(c, "Invalid token")
	}

	user, err := h.authService.GetUserByKeycloakID(c.Context(), claims.Sub)
	if err != nil {
		return response.InternalError(c, "Failed to get user")
	}

	if user == nil {
		return response.NotFound(c, "User not found. Please complete registration first.")
	}

	hasPaid, err := h.paymentService.HasPaidDeposit(c.Context(), user.ID)
	if err != nil {
		return response.InternalError(c, "Failed to check deposit status")
	}

	if hasPaid {
		return response.Conflict(c, "You have already made a deposit")
	}

	var input CreateDepositInput
	if err := c.BodyParser(&input); err != nil {
		input = CreateDepositInput{}
	}

	checkoutURL, err := h.paymentService.CreateCheckoutSession(
		c.Context(),
		user.ID,
		user.Email,
		input.SuccessURL,
		input.CancelURL,
	)
	if err != nil {
		return response.InternalError(c, "Failed to create checkout session")
	}

	return response.Success(c, map[string]string{
		"checkout_url": checkoutURL,
	})
}

func (h *DepositHandler) GetDeposits(c *fiber.Ctx) error {
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

	deposits, err := h.paymentService.GetUserDeposits(c.Context(), user.ID)
	if err != nil {
		return response.InternalError(c, "Failed to get deposits")
	}

	return response.Success(c, deposits)
}

func (h *DepositHandler) StripeWebhook(c *fiber.Ctx) error {
	payload, err := io.ReadAll(c.Context().Request.BodyStream())
	if err != nil {
		return response.BadRequest(c, "Failed to read request body")
	}

	signature := c.Get("Stripe-Signature")
	if signature == "" {
		return response.BadRequest(c, "Missing Stripe signature")
	}

	if err := h.paymentService.HandleWebhook(payload, signature); err != nil {
		return response.BadRequest(c, err.Error())
	}

	return c.SendStatus(fiber.StatusOK)
}
