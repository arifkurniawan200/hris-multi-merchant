package usecase

import (
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
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

func (uc *UserUC) RegisterUser(req *domain.RegisterRequest) (*domain.User, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	existing, _ := uc.userRepo.GetByEmail(req.Email)
	if existing != nil {
		return nil, domain.NewConflict("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12) // cost 12
	if err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("hash password: %v", err))
	}

	user := &domain.User{
		ID:           uuid.New().String(),
		Email:        req.Email,
		PasswordHash: string(hash),
		FullName:     req.FullName,
		IsActive:     true,
	}

	if err := uc.userRepo.Create(user); err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("create user: %v", err))
	}
	user.PasswordHash = ""
	return user, nil
}

func (uc *UserUC) LoginUser(req *domain.LoginRequest) (*domain.User, error) {
	if err := Validate().Struct(req); err != nil {
		return nil, domain.NewValidation(fmt.Sprintf("validation: %v", err))
	}

	user, err := uc.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, domain.NewUnauthorized("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, domain.NewUnauthorized("invalid credentials")
	}

	if !user.IsActive {
		return nil, domain.NewForbidden("account disabled")
	}

	user.PasswordHash = ""
	return user, nil
}

func (uc *UserUC) GetUser(id string) (*domain.User, error) {
	user, err := uc.userRepo.GetByID(id)
	if err != nil {
		return nil, domain.NewNotFound("user not found")
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
		return nil, domain.NewInternal(fmt.Sprintf("generate access token: %v", err))
	}

	refreshToken, err := uc.jwt.GenerateRefreshToken(userID)
	if err != nil {
		return nil, domain.NewInternal(fmt.Sprintf("generate refresh token: %v", err))
	}

	return &domain.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(15 * time.Minute / time.Second),
	}, nil
}
