package usecase

import (
	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
}

// Validate is the singleton validator instance.
func Validate() *validator.Validate {
	return validate
}
