package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func CORS(allowedOrigins []string) fiber.Handler {
	origins := "*"
	if len(allowedOrigins) > 0 {
		origins = ""
		for i, o := range allowedOrigins {
			if i > 0 {
				origins += ", "
			}
			origins += o
		}
	}

	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Requested-With",
		ExposeHeaders:    "Content-Length,Content-Type",
		AllowCredentials: true,
		MaxAge:           86400,
	})
}
