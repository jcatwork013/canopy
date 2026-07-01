package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims is the access-token payload.
type Claims struct {
	IsSystemAdmin bool `json:"adm"`
	jwt.RegisteredClaims
}

// TokenManager issues and verifies JWT access tokens and opaque refresh tokens.
type TokenManager struct {
	accessSecret []byte
	accessTTL    time.Duration
	refreshTTL   time.Duration
}

func NewTokenManager(accessSecret string, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		accessSecret: []byte(accessSecret),
		accessTTL:    accessTTL,
		refreshTTL:   refreshTTL,
	}
}

func (m *TokenManager) AccessTTL() time.Duration  { return m.accessTTL }
func (m *TokenManager) RefreshTTL() time.Duration { return m.refreshTTL }

// IssueAccess signs an access token for the user.
func (m *TokenManager) IssueAccess(userID uuid.UUID, isAdmin bool) (string, error) {
	now := time.Now()
	claims := Claims{
		IsSystemAdmin: isAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.accessTTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.accessSecret)
}

// VerifyAccess parses and validates an access token.
func (m *TokenManager) VerifyAccess(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return m.accessSecret, nil
	})
	if err != nil {
		return nil, err
	}
	return claims, nil
}

// NewRefreshToken returns a random opaque token plus its SHA-256 hash (stored).
func NewRefreshToken() (token string, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	token = base64.RawURLEncoding.EncodeToString(b)
	hash = HashToken(token)
	return token, hash, nil
}

// HashToken returns the hex SHA-256 of an opaque token (refresh/email tokens).
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
