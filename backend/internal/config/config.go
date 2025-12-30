package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	Env             string
	DatabaseURL     string
	KeycloakURL     string
	KeycloakRealm   string
	KeycloakClient  string
	JWTPublicKeyURL string
	StripeSecretKey string
	StripeWebhookSecret string
	StripeSuccessURL    string
	StripeCancelURL     string
	AllowedOrigins  []string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Port:               getEnv("PORT", "8080"),
		Env:                getEnv("ENV", "development"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/richlistbiz?sslmode=disable"),
		KeycloakURL:        getEnv("KEYCLOAK_URL", "https://richlist.biz"),
		KeycloakRealm:      getEnv("KEYCLOAK_REALM", "richlistbiz"),
		KeycloakClient:     getEnv("KEYCLOAK_CLIENT_ID", "https://richlistbiz.cloudflareaccess.com/cdn-cgi/access/callback"),
		JWTPublicKeyURL:    getEnv("JWT_PUBLIC_KEY_URL", ""),
		StripeSecretKey:    getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET", ""),
		StripeSuccessURL:   getEnv("STRIPE_SUCCESS_URL", "https://richlist.biz/dashboard?payment=success"),
		StripeCancelURL:    getEnv("STRIPE_CANCEL_URL", "https://richlist.biz/dashboard?payment=cancelled"),
		AllowedOrigins:     parseOrigins(getEnv("ALLOWED_ORIGINS", "https://richlist.biz,http://localhost:5173")),
	}

	if cfg.JWTPublicKeyURL == "" {
		cfg.JWTPublicKeyURL = cfg.KeycloakURL + "/realms/" + cfg.KeycloakRealm + "/protocol/openid-connect/certs"
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseOrigins(origins string) []string {
	parts := strings.Split(origins, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}
