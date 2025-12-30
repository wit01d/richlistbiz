package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"richlistbiz/internal/config"
	"richlistbiz/internal/database"
	"richlistbiz/internal/handlers"
	"richlistbiz/internal/middleware"
	"richlistbiz/internal/repository"
	"richlistbiz/internal/services"
	"richlistbiz/pkg/response"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	userRepo := repository.NewUserRepository(db.Pool)
	listlineRepo := repository.NewListlineRepository(db.Pool)
	depositRepo := repository.NewDepositRepository(db.Pool)
	earningRepo := repository.NewEarningRepository(db.Pool)
	withdrawalRepo := repository.NewWithdrawalRepository(db.Pool)
	adminRepo := repository.NewAdminRepository(db.Pool)

	authService := services.NewAuthService(userRepo)
	referralService := services.NewReferralService(userRepo, listlineRepo, earningRepo)
	paymentService := services.NewPaymentService(
		depositRepo,
		cfg.StripeSecretKey,
		cfg.StripeSuccessURL,
		cfg.StripeCancelURL,
		cfg.StripeWebhookSecret,
	)
	withdrawalService := services.NewWithdrawalService(withdrawalRepo)

	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(authService, referralService)
	dashboardHandler := handlers.NewDashboardHandler(authService, referralService)
	depositHandler := handlers.NewDepositHandler(authService, paymentService)
	withdrawalHandler := handlers.NewWithdrawalHandler(authService, withdrawalService)
	adminHandler := handlers.NewAdminHandler(authService, withdrawalService, adminRepo, userRepo)

	keycloakAuth := middleware.NewKeycloakAuth(cfg.KeycloakURL, cfg.KeycloakRealm, cfg.KeycloakClient)

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return response.Error(c, code, "ERROR", err.Error())
		},
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format:     "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
	}))
	app.Use(middleware.CORS(cfg.AllowedOrigins))

	app.Get("/health", func(c *fiber.Ctx) error {
		if err := db.Health(c.Context()); err != nil {
			return response.ServiceUnavailable(c, "Database connection failed")
		}
		return response.Success(c, map[string]string{"status": "healthy"})
	})

	app.Post("/webhook/stripe", depositHandler.StripeWebhook)

	api := app.Group("/api/v1")

	api.Get("/referral/validate/:code", userHandler.ValidateReferralCode)

	protected := api.Group("", keycloakAuth.Middleware())

	protected.Post("/auth/sync", authHandler.Sync)
	protected.Get("/auth/me", authHandler.Me)
	protected.Get("/auth/status", authHandler.Status)

	protected.Get("/user/profile", userHandler.GetProfile)

	protected.Get("/dashboard", dashboardHandler.GetDashboard)
	protected.Get("/dashboard/stats", dashboardHandler.GetStats)
	protected.Get("/listline", dashboardHandler.GetListline)
	protected.Get("/upline", dashboardHandler.GetUpline)
	protected.Get("/referrals", dashboardHandler.GetReferrals)

	protected.Post("/deposit/create", depositHandler.CreateCheckout)
	protected.Get("/deposits", depositHandler.GetDeposits)

	protected.Post("/withdrawal/request", withdrawalHandler.RequestWithdrawal)
	protected.Get("/withdrawals", withdrawalHandler.GetWithdrawals)

	admin := protected.Group("/admin", keycloakAuth.AdminMiddleware())

	admin.Get("/stats", adminHandler.GetStats)
	admin.Get("/users", adminHandler.ListUsers)
	admin.Get("/fraud-flags", adminHandler.GetFraudFlags)
	admin.Put("/fraud-flags/:id/resolve", adminHandler.ResolveFraudFlag)
	admin.Get("/withdrawals/pending", adminHandler.GetPendingWithdrawals)
	admin.Put("/withdrawals/:id/approve", adminHandler.ApproveWithdrawal)
	admin.Put("/withdrawals/:id/reject", adminHandler.RejectWithdrawal)

	go func() {
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Printf("Server started on port %s", cfg.Port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
