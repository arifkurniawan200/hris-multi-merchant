package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserUC struct {
	userRepo       domain.UserRepository
	userTenantRepo domain.UserTenantRepository
	resetTokenRepo domain.PasswordResetTokenRepository
	jwt            JWTComposer
	txManager      *adapter.TxManager
}

type JWTComposer interface {
	GenerateAccessToken(claims domain.JWTClaims) (string, error)
	GenerateRefreshToken(userID string) (string, error)
}

func NewUserUC(
	userRepo domain.UserRepository,
	userTenantRepo domain.UserTenantRepository,
	resetTokenRepo domain.PasswordResetTokenRepository,
	jwt JWTComposer,
	txManager *adapter.TxManager,
) domain.UserUseCase {
	return &UserUC{
		userRepo:       userRepo,
		userTenantRepo: userTenantRepo,
		resetTokenRepo: resetTokenRepo,
		jwt:            jwt,
		txManager:      txManager,
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

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
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

	// Transaction ensures atomicity when multi-table writes are involved.
	// Currently single-table (users), but pattern is established for when
	// we add user_tenant creation on registration (tenant assignment flow).
	if err := uc.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		if err := uc.userRepo.Create(txCtx, user); err != nil {
			return fmt.Errorf("create user: %w", err)
		}
		return nil
	}); err != nil {
		logger.Error(ctx, "register user failed", "email", req.Email, "error", err)
		return nil, domain.NewInternal(fmt.Sprintf("register user: %v", err))
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

func (uc *UserUC) FindUserTenant(ctx context.Context, userID string) (string, domain.UserTenantRole, error) {
	uts, err := uc.userTenantRepo.GetUserTenants(ctx, userID)
	if err != nil {
		return "", "", nil
	}
	if len(uts) == 0 {
		return "", "", nil
	}
	ut := uts[0]
	return ut.TenantID, ut.Role, nil
}

func (uc *UserUC) ForgotPassword(ctx context.Context, email string) (string, error) {
	user, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		logger.Info(ctx, "forgot password for unknown email", "email", email)
		return "", nil
	}

	_ = uc.resetTokenRepo.DeleteUnusedByUser(ctx, user.ID)

	rawToken := make([]byte, 32)
	if _, err := rand.Read(rawToken); err != nil {
		logger.Error(ctx, "failed to generate reset token", "error", err)
		return "", domain.NewInternal("failed to generate reset token")
	}
	tokenStr := hex.EncodeToString(rawToken)

	tokenHashBytes := sha256.Sum256([]byte(tokenStr))
	tokenHash := hex.EncodeToString(tokenHashBytes[:])

	now := time.Now()
	resetToken := &domain.PasswordResetToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: now.Add(1 * time.Hour),
	}

	if err := uc.resetTokenRepo.Create(ctx, resetToken); err != nil {
		logger.Error(ctx, "failed to save reset token", "error", err)
		return "", domain.NewInternal("failed to save reset token")
	}

	logger.Info(ctx, "password reset token generated", "user_id", user.ID)
	return tokenStr, nil
}

func (uc *UserUC) ResetPassword(ctx context.Context, token, password string) error {
	tokenHashBytes := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(tokenHashBytes[:])

	stored, err := uc.resetTokenRepo.GetValidByTokenHash(ctx, tokenHash)
	if err != nil {
		return domain.NewValidation("invalid or expired reset token")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		logger.Error(ctx, "hash password failed", "error", err)
		return domain.NewInternal(fmt.Sprintf("hash password: %v", err))
	}

	if err := uc.txManager.ExecTx(ctx, func(txCtx context.Context) error {
		if err := uc.userRepo.UpdatePassword(txCtx, stored.UserID, string(hash)); err != nil {
			return fmt.Errorf("update password: %w", err)
		}
		if err := uc.resetTokenRepo.MarkUsed(txCtx, stored.ID); err != nil {
			return fmt.Errorf("mark token used: %w", err)
		}
		return nil
	}); err != nil {
		logger.Error(ctx, "reset password failed", "error", err)
		return domain.NewInternal("failed to reset password")
	}

	logger.Info(ctx, "password reset successful", "user_id", stored.UserID)
	return nil
}
