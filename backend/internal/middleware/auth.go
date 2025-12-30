package middleware

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"

	"richlistbiz/internal/models"
	"richlistbiz/pkg/response"
)

type JWKS struct {
	Keys []JWK `json:"keys"`
}

type JWK struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type KeycloakAuth struct {
	jwksURL     string
	issuer      string
	clientID    string
	keys        map[string]*rsa.PublicKey
	keysMutex   sync.RWMutex
	lastRefresh time.Time
}

func NewKeycloakAuth(keycloakURL, realm, clientID string) *KeycloakAuth {
	return &KeycloakAuth{
		jwksURL:  fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs", keycloakURL, realm),
		issuer:   fmt.Sprintf("%s/realms/%s", keycloakURL, realm),
		clientID: clientID,
		keys:     make(map[string]*rsa.PublicKey),
	}
}

func (k *KeycloakAuth) fetchJWKS() error {
	k.keysMutex.Lock()
	defer k.keysMutex.Unlock()

	if time.Since(k.lastRefresh) < 5*time.Minute && len(k.keys) > 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, k.jwksURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create JWKS request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
	}

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	newKeys := make(map[string]*rsa.PublicKey)
	for _, key := range jwks.Keys {
		if key.Kty != "RSA" {
			continue
		}

		pubKey, err := parseRSAPublicKey(key)
		if err != nil {
			continue
		}
		newKeys[key.Kid] = pubKey
	}

	k.keys = newKeys
	k.lastRefresh = time.Now()
	return nil
}

func parseRSAPublicKey(jwk JWK) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode N: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode E: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := int(new(big.Int).SetBytes(eBytes).Int64())

	return &rsa.PublicKey{N: n, E: e}, nil
}

func (k *KeycloakAuth) getKey(kid string) (*rsa.PublicKey, error) {
	k.keysMutex.RLock()
	key, ok := k.keys[kid]
	k.keysMutex.RUnlock()

	if ok {
		return key, nil
	}

	if err := k.fetchJWKS(); err != nil {
		return nil, err
	}

	k.keysMutex.RLock()
	defer k.keysMutex.RUnlock()

	key, ok = k.keys[kid]
	if !ok {
		return nil, fmt.Errorf("key %s not found", kid)
	}
	return key, nil
}

func (k *KeycloakAuth) ValidateToken(tokenString string) (*models.KeycloakClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("kid header not found")
		}

		return k.getKey(kid)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	mapClaims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims type")
	}

	iss, _ := mapClaims["iss"].(string)
	if iss != k.issuer {
		return nil, fmt.Errorf("invalid issuer: expected %s, got %s", k.issuer, iss)
	}

	claims := &models.KeycloakClaims{}
	claimsJSON, err := json.Marshal(mapClaims)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal claims: %w", err)
	}

	if err := json.Unmarshal(claimsJSON, claims); err != nil {
		return nil, fmt.Errorf("failed to unmarshal claims: %w", err)
	}

	return claims, nil
}

// Middleware validates the Keycloak JWT token and sets claims in context
func (k *KeycloakAuth) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return response.Unauthorized(c, "Missing authorization header")
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return response.Unauthorized(c, "Invalid authorization header format")
		}

		tokenString := parts[1]
		claims, err := k.ValidateToken(tokenString)
		if err != nil {
			return response.Unauthorized(c, fmt.Sprintf("Invalid token: %v", err))
		}

		// Store claims and user info in context for handlers
		c.Locals("claims", claims)
		c.Locals("keycloak_id", claims.Sub)
		c.Locals("email", claims.Email)
		c.Locals("name", claims.GetDisplayName())

		return c.Next()
	}
}

// OptionalMiddleware validates token if present but doesn't require it
func (k *KeycloakAuth) OptionalMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Next()
		}

		tokenString := parts[1]
		claims, err := k.ValidateToken(tokenString)
		if err != nil {
			return c.Next()
		}

		c.Locals("claims", claims)
		c.Locals("keycloak_id", claims.Sub)
		c.Locals("email", claims.Email)
		c.Locals("name", claims.GetDisplayName())

		return c.Next()
	}
}

// AdminMiddleware requires admin role from Keycloak
func (k *KeycloakAuth) AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*models.KeycloakClaims)
		if !ok {
			return response.Unauthorized(c, "Authentication required")
		}

		if !claims.IsAdmin() {
			return response.Forbidden(c, "Admin access required")
		}

		return c.Next()
	}
}

// Helper functions to get values from context

func GetClaims(c *fiber.Ctx) *models.KeycloakClaims {
	claims, ok := c.Locals("claims").(*models.KeycloakClaims)
	if !ok {
		return nil
	}
	return claims
}

func GetKeycloakID(c *fiber.Ctx) string {
	id, _ := c.Locals("keycloak_id").(string)
	return id
}

func GetEmail(c *fiber.Ctx) string {
	email, _ := c.Locals("email").(string)
	return email
}

func GetName(c *fiber.Ctx) string {
	name, _ := c.Locals("name").(string)
	return name
}

func IsAuthenticated(c *fiber.Ctx) bool {
	return GetClaims(c) != nil
}
