package domain

import "fmt"

// ── Structured domain errors ──────────────────────

type AppError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Err     error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// ── Constructors ──────────────────────────────────

func NewNotFound(message string) *AppError {
	return &AppError{Code: 404, Message: message}
}

func NewConflict(message string) *AppError {
	return &AppError{Code: 409, Message: message}
}

func NewValidation(message string) *AppError {
	return &AppError{Code: 400, Message: message}
}

func NewUnauthorized(message string) *AppError {
	return &AppError{Code: 401, Message: message}
}

func NewForbidden(message string) *AppError {
	return &AppError{Code: 403, Message: message}
}

func NewInternal(message string) *AppError {
	return &AppError{Code: 500, Message: message}
}

// ── Sentinels ────────────────────────────────────

var (
	ErrNotFound     = NewNotFound("resource not found")
	ErrConflict     = NewConflict("resource already exists")
	ErrValidation   = NewValidation("validation failed")
	ErrUnauthorized = NewUnauthorized("unauthorized")
	ErrForbidden    = NewForbidden("forbidden")
	ErrInternal     = NewInternal("internal server error")
)
