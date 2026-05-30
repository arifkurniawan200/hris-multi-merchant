package domain

import "fmt"

// ── Structured domain errors ──────────────────────
//
// Error codes use 3xxx range to avoid collision with HTTP status codes.
// Code ranges:
//
//	3000–3099: validation / input errors
//	3100–3199: resource errors (not found, conflict)
//	3200–3299: auth errors
//	3300–3399: tenant / context errors
//	3999:       internal server error

type AppError struct {
	Code    int    `json:"code"`    // business error code (3xxx)
	Message string `json:"message"` // human-readable message
	Err     error  `json:"-"`       // underlying error, not serialized
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
	return &AppError{Code: 3101, Message: message}
}

func NewConflict(message string) *AppError {
	return &AppError{Code: 3102, Message: message}
}

func NewValidation(message string) *AppError {
	return &AppError{Code: 3001, Message: message}
}

func NewUnauthorized(message string) *AppError {
	return &AppError{Code: 3201, Message: message}
}

func NewForbidden(message string) *AppError {
	return &AppError{Code: 3202, Message: message}
}

func NewInternal(message string) *AppError {
	return &AppError{Code: 3999, Message: message}
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
