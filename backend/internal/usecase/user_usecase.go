package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserUC struct {
	userRepo domain.UserRepository
	jwt      JWTComposer
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
		userRepo: userRepo,
		jwt:      jwt,
	}
}

func (uc *UserUC) RegisterUser(ctx context.Context, req *domain.RegisterRequest) (*domain.User, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.userRepo.GetByEmail(ctx, req.Email)
	if existing != nil {
		return nil, domain.NewConflict("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12) // cost 12
	if err != nil {
		logger.Error(ctx, "hash password failed", "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("hash password: %v", err))
	}

	user := &domain.User{
		ID:           uuid.New().String(),
		Email:        req.Email,
		PasswordHash: string(hash),
		FullName:     req.FullName,
		IsActive:     true,
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		logger.Error(ctx, "create user failed", "email", req.Email, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("create user: %v", err))
	}

	logger.Info(ctx, "user registered", "user_id", user.ID, "email", user.Email)
	user.PasswordHash = ""
	return user, nil
}

func (uc *UserUC) LoginUser(ctx context.Context, req *domain.LoginRequest) (*domain.User, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	user, err := uc.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, domain.NewUnauthorized("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, domain.NewUnauthorized("invalid credentials")
	}

	if !user.IsActive {
		return nil, domain.NewForbidden("account disabled")
	}

	logger.Info(ctx, "user login", "user_id", user.ID, "email", user.Email)
	user.PasswordHash = ""
	return user, nil
}

func (uc *UserUC) GetUser(ctx context.Context, id string) (*domain.User, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, domain.NewNotFound("user not found")
	}
	user.PasswordHash = ""
	return user, nil
}

func (uc *UserUC) IssueTokens(ctx context.Context, userID string, email string, tenantID string, role domain.UserTenantRole) (*domain.TokenPair, error) {
	claims := domain.JWTClaims{
		UserID:   userID,
		Email:    email,
		TenantID: tenantID,
		Role:     role,
	}

	accessToken, err := uc.jwt.GenerateAccessToken(claims)
	if err != nil {
		logger.Error(ctx, "generate access token failed", "user_id", userID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("generate access token: %v", err))
	}

	refreshToken, err := uc.jwt.GenerateRefreshToken(userID)
	if err != nil {
		logger.Error(ctx, "generate refresh token failed", "user_id", userID, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("generate refresh token: %v", err))
	}

	return &domain.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(15 * time.Minute / time.Second),
	}, nil
}
