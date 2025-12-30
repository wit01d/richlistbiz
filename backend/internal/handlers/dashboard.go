package handlers

import (
	"github.com/gofiber/fiber/v2"

	"richlistbiz/internal/middleware"
	"richlistbiz/internal/services"
	"richlistbiz/pkg/response"
)

type DashboardHandler struct {
	authService     *services.AuthService
	referralService *services.ReferralService
}

func NewDashboardHandler(authService *services.AuthService, referralService *services.ReferralService) *DashboardHandler {
	return &DashboardHandler{
		authService:     authService,
		referralService: referralService,
	}
}

func (h *DashboardHandler) GetDashboard(c *fiber.Ctx) error {
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

	dashboard, err := h.referralService.GetDashboardData(c.Context(), user)
	if err != nil {
		return response.InternalError(c, "Failed to get dashboard data")
	}

	return response.Success(c, dashboard)
}

func (h *DashboardHandler) GetStats(c *fiber.Ctx) error {
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

	stats, err := h.referralService.GetListlineStats(c.Context(), user.ID)
	if err != nil {
		return response.InternalError(c, "Failed to get stats")
	}

	return response.Success(c, stats)
}

func (h *DashboardHandler) GetListline(c *fiber.Ctx) error {
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

	listline, err := h.referralService.GetListlineDetails(c.Context(), user.ID)
	if err != nil {
		return response.InternalError(c, "Failed to get listline")
	}

	return response.Success(c, listline)
}

func (h *DashboardHandler) GetUpline(c *fiber.Ctx) error {
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

	upline, err := h.referralService.GetUplineChain(c.Context(), user.ID, 10)
	if err != nil {
		return response.InternalError(c, "Failed to get upline")
	}

	return response.Success(c, upline)
}

func (h *DashboardHandler) GetReferrals(c *fiber.Ctx) error {
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

	referrals, err := h.referralService.GetDirectReferrals(c.Context(), user.ID)
	if err != nil {
		return response.InternalError(c, "Failed to get referrals")
	}

	return response.Success(c, referrals)
}
