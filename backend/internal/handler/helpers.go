package handler

import (
	"net/http"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

// handleDomainErr maps domain.AppError to a structured HTTP response with proper error codes.
func handleDomainErr(w http.ResponseWriter, r *http.Request, err error) {
	reqID := middleware.GetReqID(r.Context())

	if appErr, ok := err.(*domain.AppError); ok {
		// Map business error code to HTTP status
		var httpStatus int
		switch {
		case appErr.Code == 3001: // validation
			httpStatus = http.StatusBadRequest
		case appErr.Code == 3101: // not found
			httpStatus = http.StatusNotFound
		case appErr.Code == 3102: // conflict
			httpStatus = http.StatusConflict
		case appErr.Code == 3201: // unauthorized
			httpStatus = http.StatusUnauthorized
		case appErr.Code == 3202: // forbidden
			httpStatus = http.StatusForbidden
		case appErr.Code == 3999: // internal
			httpStatus = http.StatusInternalServerError
		default:
			httpStatus = http.StatusInternalServerError
		}
		response.Err(w, httpStatus, appErr.Code, appErr.Message, reqID)
		return
	}

	// Unknown error → 500
	response.Err(w, http.StatusInternalServerError, response.ErrInternal, err.Error(), reqID)
}
