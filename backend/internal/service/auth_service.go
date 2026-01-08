package service

import (
	"context"
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"gist/backend/internal/repository"
)

// Auth setting keys
const (
	keyUserUsername     = "user.username"
	keyUserEmail        = "user.email"
	keyUserPasswordHash = "user.password_hash"
	keyUserJWTSecret    = "user.jwt_secret"
)

// Auth errors
var (
	ErrUserExists       = errors.New("user already exists")
	ErrUserNotFound     = errors.New("user not found")
	ErrInvalidPassword  = errors.New("invalid password")
	ErrInvalidToken     = errors.New("invalid token")
	ErrUsernameRequired = errors.New("username is required")
	ErrEmailRequired    = errors.New("email is required")
	ErrPasswordRequired = errors.New("password is required")
	ErrPasswordTooShort = errors.New("password must be at least 6 characters")
)

// User represents the authenticated user.
type User struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatarUrl"`
}

// AuthService provides authentication functionality.
type AuthService interface {
	// CheckUserExists checks if a user has been registered.
	CheckUserExists(ctx context.Context) (bool, error)
	// Register creates a new user (only if none exists).
	Register(ctx context.Context, username, email, password string) (*AuthResponse, error)
	// Login authenticates a user and returns a JWT token.
	Login(ctx context.Context, username, password string) (*AuthResponse, error)
	// GetCurrentUser returns the current user info.
	GetCurrentUser(ctx context.Context) (*User, error)
	// ValidateToken validates a JWT token and returns whether it's valid.
	ValidateToken(token string) (bool, error)
}

// AuthResponse is returned after successful login/register.
type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

type authService struct {
	repo repository.SettingsRepository
}

// NewAuthService creates a new auth service.
func NewAuthService(repo repository.SettingsRepository) AuthService {
	return &authService{repo: repo}
}

// CheckUserExists checks if a user has been registered.
func (s *authService) CheckUserExists(ctx context.Context) (bool, error) {
	setting, err := s.repo.Get(ctx, keyUserUsername)
	if err != nil {
		return false, fmt.Errorf("check user exists: %w", err)
	}
	return setting != nil && setting.Value != "", nil
}

// Register creates a new user (only if none exists).
func (s *authService) Register(ctx context.Context, username, email, password string) (*AuthResponse, error) {
	// Validate input
	username = strings.TrimSpace(username)
	email = strings.TrimSpace(email)

	if username == "" {
		return nil, ErrUsernameRequired
	}
	if email == "" {
		return nil, ErrEmailRequired
	}
	if password == "" {
		return nil, ErrPasswordRequired
	}
	if len(password) < 6 {
		return nil, ErrPasswordTooShort
	}

	// Check if user already exists
	exists, err := s.CheckUserExists(ctx)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrUserExists
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	// Generate JWT secret
	jwtSecret := make([]byte, 32)
	if _, err := rand.Read(jwtSecret); err != nil {
		return nil, fmt.Errorf("generate jwt secret: %w", err)
	}
	jwtSecretHex := hex.EncodeToString(jwtSecret)

	// Save user info
	if err := s.repo.Set(ctx, keyUserUsername, username); err != nil {
		return nil, fmt.Errorf("save username: %w", err)
	}
	if err := s.repo.Set(ctx, keyUserEmail, email); err != nil {
		return nil, fmt.Errorf("save email: %w", err)
	}
	if err := s.repo.Set(ctx, keyUserPasswordHash, string(hash)); err != nil {
		return nil, fmt.Errorf("save password hash: %w", err)
	}
	if err := s.repo.Set(ctx, keyUserJWTSecret, jwtSecretHex); err != nil {
		return nil, fmt.Errorf("save jwt secret: %w", err)
	}

	// Generate token and return
	token, err := s.generateToken(username, jwtSecretHex)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User: &User{
			Username:  username,
			Email:     email,
			AvatarURL: gravatarURL(email),
		},
	}, nil
}

// Login authenticates a user and returns a JWT token.
func (s *authService) Login(ctx context.Context, username, password string) (*AuthResponse, error) {
	username = strings.TrimSpace(username)

	if username == "" {
		return nil, ErrUsernameRequired
	}
	if password == "" {
		return nil, ErrPasswordRequired
	}

	// Get stored username
	storedUsername, err := s.getString(ctx, keyUserUsername)
	if err != nil {
		return nil, err
	}
	if storedUsername == "" {
		return nil, ErrUserNotFound
	}

	// Check username
	if storedUsername != username {
		return nil, ErrInvalidPassword
	}

	// Get stored password hash
	storedHash, err := s.getString(ctx, keyUserPasswordHash)
	if err != nil {
		return nil, err
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password)); err != nil {
		return nil, ErrInvalidPassword
	}

	// Get email and JWT secret
	email, _ := s.getString(ctx, keyUserEmail)
	jwtSecret, err := s.getString(ctx, keyUserJWTSecret)
	if err != nil {
		return nil, err
	}

	// Generate token
	token, err := s.generateToken(username, jwtSecret)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User: &User{
			Username:  username,
			Email:     email,
			AvatarURL: gravatarURL(email),
		},
	}, nil
}

// GetCurrentUser returns the current user info.
func (s *authService) GetCurrentUser(ctx context.Context) (*User, error) {
	username, err := s.getString(ctx, keyUserUsername)
	if err != nil {
		return nil, err
	}
	if username == "" {
		return nil, ErrUserNotFound
	}

	email, _ := s.getString(ctx, keyUserEmail)

	return &User{
		Username:  username,
		Email:     email,
		AvatarURL: gravatarURL(email),
	}, nil
}

// ValidateToken validates a JWT token.
func (s *authService) ValidateToken(tokenString string) (bool, error) {
	jwtSecret, err := s.getString(context.Background(), keyUserJWTSecret)
	if err != nil || jwtSecret == "" {
		return false, ErrInvalidToken
	}

	secretBytes, err := hex.DecodeString(jwtSecret)
	if err != nil {
		return false, ErrInvalidToken
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secretBytes, nil
	})

	if err != nil || !token.Valid {
		return false, ErrInvalidToken
	}

	return true, nil
}

// generateToken creates a new JWT token.
func (s *authService) generateToken(username, jwtSecretHex string) (string, error) {
	secretBytes, err := hex.DecodeString(jwtSecretHex)
	if err != nil {
		return "", fmt.Errorf("decode jwt secret: %w", err)
	}

	claims := jwt.MapClaims{
		"sub": username,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(30 * 24 * time.Hour).Unix(), // 30 days
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(secretBytes)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}

	return tokenString, nil
}

// getString gets a string value from settings.
func (s *authService) getString(ctx context.Context, key string) (string, error) {
	setting, err := s.repo.Get(ctx, key)
	if err != nil {
		return "", err
	}
	if setting == nil {
		return "", nil
	}
	return setting.Value, nil
}

// gravatarURL generates a Gravatar URL for the given email.
func gravatarURL(email string) string {
	email = strings.ToLower(strings.TrimSpace(email))
	hash := md5.Sum([]byte(email))
	return fmt.Sprintf("https://www.gravatar.com/avatar/%s?d=mp&s=80", hex.EncodeToString(hash[:]))
}
