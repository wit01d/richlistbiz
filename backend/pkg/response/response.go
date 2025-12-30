package response

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

type Meta struct {
	Timestamp  time.Time `json:"timestamp"`
	Page       int       `json:"page,omitempty"`
	PerPage    int       `json:"per_page,omitempty"`
	TotalCount int       `json:"total_count,omitempty"`
	TotalPages int       `json:"total_pages,omitempty"`
}

func Success(c *fiber.Ctx, data interface{}) error {
	return c.JSON(APIResponse{
		Success: true,
		Data:    data,
		Meta: &Meta{
			Timestamp: time.Now().UTC(),
		},
	})
}

func SuccessWithMeta(c *fiber.Ctx, data interface{}, meta *Meta) error {
	if meta != nil {
		meta.Timestamp = time.Now().UTC()
	}
	return c.JSON(APIResponse{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

func Created(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(APIResponse{
		Success: true,
		Data:    data,
		Meta: &Meta{
			Timestamp: time.Now().UTC(),
		},
	})
}

func NoContent(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

func Error(c *fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
		},
		Meta: &Meta{
			Timestamp: time.Now().UTC(),
		},
	})
}

func ErrorWithDetails(c *fiber.Ctx, status int, code, message, details string) error {
	return c.Status(status).JSON(APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
		Meta: &Meta{
			Timestamp: time.Now().UTC(),
		},
	})
}

func BadRequest(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusBadRequest, "BAD_REQUEST", message)
}

func Unauthorized(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Authentication required"
	}
	return Error(c, fiber.StatusUnauthorized, "UNAUTHORIZED", message)
}

func Forbidden(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Access denied"
	}
	return Error(c, fiber.StatusForbidden, "FORBIDDEN", message)
}

func NotFound(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Resource not found"
	}
	return Error(c, fiber.StatusNotFound, "NOT_FOUND", message)
}

func Conflict(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusConflict, "CONFLICT", message)
}

func UnprocessableEntity(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusUnprocessableEntity, "UNPROCESSABLE_ENTITY", message)
}

func TooManyRequests(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Rate limit exceeded"
	}
	return Error(c, fiber.StatusTooManyRequests, "RATE_LIMITED", message)
}

func InternalError(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Internal server error"
	}
	return Error(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", message)
}

func ServiceUnavailable(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Service temporarily unavailable"
	}
	return Error(c, fiber.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", message)
}
