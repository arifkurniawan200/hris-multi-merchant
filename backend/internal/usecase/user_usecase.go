package usecase

import (
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserUC struct {
	userRepo    domain.UserRepository
	jwt         JWTComposer
}

type JWTComposer interface {
	GenerateAccessToken(claims domain.JWTClaims) (string, error)
	GenerateRefreshToken(userID string) (string, error)
}

func NewUserUC(
	userRepo domain.UserRepository,
	jwt JWTComposer,
) domain.UserUseCase {
	return &UserUC{
		userRepo:    userRepo,
		jwt:         jwt,
	}
}

func (uc *UserUC) RegisterUser(email, password, fullName string) (*domain.User, error) {
	if email == "" || password == "" {
		return nil, fmt.Errorf("email and password required")
	}
	if len(password) < 8 {
		return nil, fmt.Errorf("password must be at least 8 characters")
	}

	existing, _ := uc.userRepo.GetByEmail(email)
	if existing != nil {
		return nil, fmt.Errorf("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost+2)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &domain.User{
		ID:           uuid.New().String(),
		Email:        email,
		PasswordHash: string(hash),
		FullName:     fullName,
		IsActive:     true,
	}

	if err := uc.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	user.PasswordHash = ""
	return user, nil
}

func (uc *UserUC) LoginUser(email, password string) (*domain.User, error) {
	user, err := uc.userRepo.GetByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("invalid_credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("invalid_credentials")
	}

	if !user.IsActive {
		return nil, fmt.Errorf("account_disabled")
	}

	user.PasswordHash = ""
	return user, nil
}

func (uc *UserUC) GetUser(id string) (*domain.User, error) {
	user, err := uc.userRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	user.PasswordHash = ""
	return user, nil
}

func (uc *UserUC) IssueTokens(userID string, email string, tenantID string, role domain.UserTenantRole) (*domain.TokenPair, error) {
	claims := domain.JWTClaims{
		UserID:   userID,
		Email:    email,
		TenantID: tenantID,
		Role:     role,
	}

	accessToken, err := uc.jwt.GenerateAccessToken(claims)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	refreshToken, err := uc.jwt.GenerateRefreshToken(userID)
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	return &domain.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(15 * time.Minute / time.Second),
	}, nil
}
