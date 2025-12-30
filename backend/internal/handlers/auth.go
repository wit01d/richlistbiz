package handlers

import (
	"github.com/gofiber/fiber/v2"

	"richlistbiz/internal/middleware"
	"richlistbiz/internal/services"
	"richlistbiz/pkg/response"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// SyncInput is used when syncing a Keycloak user to our database
type SyncInput struct {
	ReferralCode string `json:"referral_code,omitempty"`
}

// Sync creates or updates a user in our database based on their Keycloak identity.
// This should be called after the user logs in via Keycloak.
// If the user doesn't exist, they will be created with the optional referral code.
// POST /api/v1/auth/sync
func (h *AuthHandler) Sync(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	if claims == nil {
		return response.Unauthorized(c, "Invalid token")
	}

	var input SyncInput
	if err := c.BodyParser(&input); err != nil {
		// It's OK if no body is provided
		input = SyncInput{}
	}

	user, isNew, err := h.authService.GetOrCreateUser(c.Context(), claims, input.ReferralCode)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	result := map[string]interface{}{
		"user":       user,
		"is_new":     isNew,
		"keycloak_id": claims.Sub,
	}

	if isNew {
		result["message"] = "Account created successfully"
		return response.Created(c, result)
	}

	result["message"] = "Account synced successfully"
	return response.Success(c, result)
}

// Me returns the current user's profile from our database.
// The user must have called /sync at least once before this will work.
// GET /api/v1/auth/me
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	if claims == nil {
		return response.Unauthorized(c, "Invalid token")
	}

	user, err := h.authService.GetUserByKeycloakID(c.Context(), claims.Sub)
	if err != nil {
		return response.InternalError(c, "Failed to get user")
	}

	if user == nil {
		// User exists in Keycloak but not in our database
		return response.NotFound(c, "User not found. Please call /api/v1/auth/sync first.")
	}

	return response.Success(c, map[string]interface{}{
		"user":        user,
		"keycloak_id": claims.Sub,
		"email":       claims.Email,
		"name":        claims.GetDisplayName(),
		"roles":       claims.RealmAccess.Roles,
		"is_admin":    claims.IsAdmin(),
	})
}

// Status returns the authentication status without requiring a database user.
// Useful for checking if the token is valid and what claims it contains.
// GET /api/v1/auth/status
func (h *AuthHandler) Status(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	if claims == nil {
		return response.Unauthorized(c, "Invalid token")
	}

	// Check if user exists in our database
	user, _ := h.authService.GetUserByKeycloakID(c.Context(), claims.Sub)

	return response.Success(c, map[string]interface{}{
		"authenticated":   true,
		"keycloak_id":     claims.Sub,
		"email":           claims.Email,
		"email_verified":  claims.EmailVerified,
		"name":            claims.GetDisplayName(),
		"roles":           claims.RealmAccess.Roles,
		"is_admin":        claims.IsAdmin(),
		"has_db_account":  user != nil,
		"token_issued_at": claims.Iat,
		"token_expires":   claims.Exp,
	})
}
