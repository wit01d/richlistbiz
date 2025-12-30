package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"richlistbiz/internal/middleware"
	"richlistbiz/internal/repository"
	"richlistbiz/internal/services"
	"richlistbiz/pkg/response"
)

type AdminHandler struct {
	authService       *services.AuthService
	withdrawalService *services.WithdrawalService
	adminRepo         *repository.AdminRepository
	userRepo          *repository.UserRepository
}

func NewAdminHandler(
	authService *services.AuthService,
	withdrawalService *services.WithdrawalService,
	adminRepo *repository.AdminRepository,
	userRepo *repository.UserRepository,
) *AdminHandler {
	return &AdminHandler{
		authService:       authService,
		withdrawalService: withdrawalService,
		adminRepo:         adminRepo,
		userRepo:          userRepo,
	}
}

func (h *AdminHandler) GetStats(c *fiber.Ctx) error {
	stats, err := h.adminRepo.GetSystemStats(c.Context())
	if err != nil {
		return response.InternalError(c, "Failed to get system stats")
	}

	return response.Success(c, stats)
}

func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	offset := (page - 1) * perPage

	users, total, err := h.userRepo.ListAll(c.Context(), perPage, offset)
	if err != nil {
		return response.InternalError(c, "Failed to list users")
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, users, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		TotalCount: total,
		TotalPages: totalPages,
	})
}

func (h *AdminHandler) GetFraudFlags(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	resolved := c.Query("resolved", "false") == "true"

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	offset := (page - 1) * perPage

	flags, total, err := h.adminRepo.GetFraudFlags(c.Context(), resolved, perPage, offset)
	if err != nil {
		return response.InternalError(c, "Failed to get fraud flags")
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, flags, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		TotalCount: total,
		TotalPages: totalPages,
	})
}

type ResolveFraudFlagInput struct {
	Notes string `json:"notes"`
}

func (h *AdminHandler) ResolveFraudFlag(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	if claims == nil {
		return response.Unauthorized(c, "Invalid token")
	}

	flagID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Invalid fraud flag ID")
	}

	var input ResolveFraudFlagInput
	if err := c.BodyParser(&input); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	admin, err := h.authService.GetUserByKeycloakID(c.Context(), claims.Sub)
	if err != nil || admin == nil {
		return response.InternalError(c, "Failed to get admin user")
	}

	if err := h.adminRepo.ResolveFraudFlag(c.Context(), flagID, admin.ID, input.Notes); err != nil {
		return response.InternalError(c, "Failed to resolve fraud flag")
	}

	return response.Success(c, map[string]string{"message": "Fraud flag resolved"})
}

func (h *AdminHandler) GetPendingWithdrawals(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	offset := (page - 1) * perPage

	withdrawals, total, err := h.withdrawalService.GetPendingWithdrawals(c.Context(), perPage, offset)
	if err != nil {
		return response.InternalError(c, "Failed to get pending withdrawals")
	}

	totalPages := (total + perPage - 1) / perPage

	return response.SuccessWithMeta(c, withdrawals, &response.Meta{
		Page:       page,
		PerPage:    perPage,
		TotalCount: total,
		TotalPages: totalPages,
	})
}

func (h *AdminHandler) ApproveWithdrawal(c *fiber.Ctx) error {
	withdrawalID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Invalid withdrawal ID")
	}

	if err := h.withdrawalService.ApproveWithdrawal(c.Context(), withdrawalID); err != nil {
		return response.BadRequest(c, err.Error())
	}

	return response.Success(c, map[string]string{"message": "Withdrawal approved"})
}

type RejectWithdrawalInput struct {
	Reason string `json:"reason"`
}

func (h *AdminHandler) RejectWithdrawal(c *fiber.Ctx) error {
	withdrawalID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Invalid withdrawal ID")
	}

	var input RejectWithdrawalInput
	if err := c.BodyParser(&input); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if input.Reason == "" {
		return response.BadRequest(c, "Rejection reason is required")
	}

	if err := h.withdrawalService.RejectWithdrawal(c.Context(), withdrawalID, input.Reason); err != nil {
		return response.BadRequest(c, err.Error())
	}

	return response.Success(c, map[string]string{"message": "Withdrawal rejected"})
}
