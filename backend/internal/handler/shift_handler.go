package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

// ── Shift Handler (admin CRUD) ──────────────────

type ShiftHandler struct {
	uc     domain.ShiftUseCase
	empUC  domain.EmployeeShiftUseCase
	empRepo domain.EmployeeRepository
}

func NewShiftHandler(uc domain.ShiftUseCase, empUC domain.EmployeeShiftUseCase, empRepo domain.EmployeeRepository) *ShiftHandler {
	return &ShiftHandler{uc: uc, empUC: empUC, empRepo: empRepo}
}

// ── Shift CRUD ──────────────────────────────────

func (h *ShiftHandler) Create(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var req domain.CreateShiftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}
	req.TenantID = tenantID

	shift, err := h.uc.Create(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Shift created", shift, reqID)
}

func (h *ShiftHandler) List(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	shifts, err := h.uc.List(r.Context(), tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", shifts, reqID)
}

func (h *ShiftHandler) Get(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing shift ID", reqID)
		return
	}

	shift, err := h.uc.Get(r.Context(), id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", shift, reqID)
}

func (h *ShiftHandler) Update(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing shift ID", reqID)
		return
	}

	shift, err := h.uc.Get(r.Context(), id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	type updateShiftReq struct {
		Name                *string `json:"name"`
		Code                *string `json:"code"`
		StartTime           *string `json:"start_time"`
		EndTime             *string `json:"end_time"`
		GraceMinutes        *int    `json:"grace_minutes"`
		ClockinWindowBefore *int    `json:"clockin_window_before_minutes"`
		ClockoutWindowAfter *int    `json:"clockout_window_after_minutes"`
		IsFlexible          *bool   `json:"is_flexible"`
		Color               *string `json:"color"`
	}

	var req updateShiftReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	if req.Name != nil {
		shift.Name = *req.Name
	}
	if req.Code != nil {
		shift.Code = *req.Code
	}
	if req.StartTime != nil {
		shift.StartTime = *req.StartTime
	}
	if req.EndTime != nil {
		shift.EndTime = *req.EndTime
	}
	if req.GraceMinutes != nil {
		shift.GraceMinutes = *req.GraceMinutes
	}
	if req.ClockinWindowBefore != nil {
		shift.ClockinWindowBefore = *req.ClockinWindowBefore
	}
	if req.ClockoutWindowAfter != nil {
		shift.ClockoutWindowAfter = *req.ClockoutWindowAfter
	}
	if req.IsFlexible != nil {
		shift.IsFlexible = *req.IsFlexible
	}
	if req.Color != nil {
		shift.Color = *req.Color
	}

	if err := h.uc.Update(r.Context(), shift); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Shift updated", shift, reqID)
}

func (h *ShiftHandler) Delete(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing shift ID", reqID)
		return
	}

	if err := h.uc.SoftDelete(r.Context(), id); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Shift deleted", map[string]string{"status": "deleted"}, reqID)
}

// ── Employee Shift Assignment ───────────────────

// AssignShift assigns a shift to an employee.
func (h *ShiftHandler) AssignShift(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	employeeID := r.PathValue("id")
	if employeeID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing employee ID", reqID)
		return
	}

	var req domain.AssignShiftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}
	req.EmployeeID = employeeID

	es, err := h.empUC.Assign(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Shift assigned to employee", es, reqID)
}

// ListEmployeeShifts lists all shift assignments for an employee.
func (h *ShiftHandler) ListEmployeeShifts(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	employeeID := r.PathValue("id")
	if employeeID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing employee ID", reqID)
		return
	}

	assignments, err := h.empUC.ListByEmployee(r.Context(), employeeID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", assignments, reqID)
}

// UpdateAssignment updates a shift assignment.
func (h *ShiftHandler) UpdateAssignment(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	assignmentID := r.PathValue("sid")
	if assignmentID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing assignment ID", reqID)
		return
	}

	es, err := h.empUC.Get(r.Context(), assignmentID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	type updateAssignmentReq struct {
		ShiftID       *string `json:"shift_id"`
		EffectiveFrom *string `json:"effective_from"`
		EffectiveTo   *string `json:"effective_to"`
	}

	var req updateAssignmentReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	if req.ShiftID != nil {
		es.ShiftID = *req.ShiftID
	}
	if req.EffectiveFrom != nil {
		es.EffectiveFrom = *req.EffectiveFrom
	}
	es.EffectiveTo = req.EffectiveTo

	if err := h.empUC.Update(r.Context(), es); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Assignment updated", es, reqID)
}

// RemoveAssignment removes a shift assignment.
func (h *ShiftHandler) RemoveAssignment(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	assignmentID := r.PathValue("sid")
	if assignmentID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing assignment ID", reqID)
		return
	}

	if err := h.empUC.RemoveAssignment(r.Context(), assignmentID); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Assignment removed", map[string]string{"status": "deleted"}, reqID)
}

// BulkAssign assigns a shift to multiple employees.
func (h *ShiftHandler) BulkAssign(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	var req domain.BulkAssignShiftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	assignments, err := h.empUC.BulkAssign(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Bulk shift assignment complete", assignments, reqID)
}

// ListShiftEmployees lists all employees assigned to a shift.
func (h *ShiftHandler) ListShiftEmployees(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	shiftID := r.PathValue("id")
	if shiftID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing shift ID", reqID)
		return
	}

	assignments, err := h.empUC.ListByShift(r.Context(), shiftID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", assignments, reqID)
}

// ── Employee Self-Service ────────────────────────

// MyShift returns the employee's active shift for today.
func (h *ShiftHandler) MyShift(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if userID == "" || tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No user context", reqID)
		return
	}

	// Resolve employee from JWT
	emp, err := h.empRepo.GetByUserID(r.Context(), tenantID, userID)
	if err != nil {
		handleDomainErr(w, r, domain.NewNotFound("employee not found for this user"))
		return
	}

	today := time.Now().Format("2006-01-02")

	assignment, err := h.empUC.GetActive(r.Context(), emp.ID, today)
	if err != nil {
		response.JSON(w, http.StatusOK, "No shift assigned", map[string]string{
			"message": "no active shift for today",
			"date":    today,
		}, reqID)
		return
	}

	response.JSON(w, http.StatusOK, "Success", assignment, reqID)
}
