package handler

import (
	"log"
	"net/http"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

// handleDomainErr maps domain.AppError to a structured HTTP response with proper error codes.
func handleDomainErr(w http.ResponseWriter, r *http.Request, err error) {
	reqID := middleware.GetReqID(r.Context())

	if appErr, ok := err.(*domain.AppError); ok {
		// Log the original error for debugging
		log.Printf("[%s] AppError (code=%d): %s", reqID, appErr.Code, appErr.Message)

		// Map business error code to HTTP status
		var httpStatus int
		var message string
		switch {
		case appErr.Code == 3001: // validation
			httpStatus = http.StatusBadRequest
			message = appErr.Message
		case appErr.Code == 3101: // not found
			httpStatus = http.StatusNotFound
			message = appErr.Message
		case appErr.Code == 3102: // conflict
			httpStatus = http.StatusConflict
			message = appErr.Message
		case appErr.Code == 3201: // unauthorized
			httpStatus = http.StatusUnauthorized
			message = appErr.Message
		case appErr.Code == 3202: // forbidden
			httpStatus = http.StatusForbidden
			message = appErr.Message
		case appErr.Code == 3999: // internal
			httpStatus = http.StatusInternalServerError
			message = "Terjadi kesalahan pada sistem"
		default:
			httpStatus = http.StatusInternalServerError
			message = "Terjadi kesalahan pada sistem"
		}
		response.Err(w, httpStatus, appErr.Code, message, reqID)
		return
	}

	// Unknown error → 500 (log the real error, show generic message)
	log.Printf("[%s] Unknown error: %s", reqID, err.Error())
	response.Err(w, http.StatusInternalServerError, response.ErrInternal, "Terjadi kesalahan pada sistem", reqID)
}
