package handler

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"github.com/xuri/excelize/v2"
)

// ── Attendance Handler ──────────────────────────

type AttendanceHandler struct {
	uc domain.AttendanceUseCase
}

func NewAttendanceHandler(uc domain.AttendanceUseCase) *AttendanceHandler {
	return &AttendanceHandler{uc: uc}
}

func (h *AttendanceHandler) ClockIn(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.ClockInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	// Set tenant from context, employeeID from JWT or body
	req.TenantID = tenantID
	req.UserID = userID

	att, err := h.uc.ClockIn(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Clock-in recorded", att, reqID)
}

func (h *AttendanceHandler) ClockOut(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.ClockOutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	req.TenantID = tenantID
	req.UserID = userID

	att, err := h.uc.ClockOut(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Clock-out recorded", att, reqID)
}

func (h *AttendanceHandler) History(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	userID, _ := r.Context().Value(middleware.CtxUserID).(string)
	if userID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No user context", reqID)
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	attendances, err := h.uc.GetHistory(r.Context(), userID, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", attendances, reqID)
}

func (h *AttendanceHandler) Report(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	q := r.URL.Query()
	date := q.Get("date")
	if date == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing date parameter", reqID)
		return
	}

	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	report, err := h.uc.GetReport(r.Context(), tenantID, date, limit, offset)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", report, reqID)
}

// ExportPreview returns the count of attendance records that would be exported.
func (h *AttendanceHandler) ExportPreview(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	q := r.URL.Query()
	dateFrom := q.Get("date_from")
	dateTo := q.Get("date_to")

	if dateFrom == "" || dateTo == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "date_from and date_to are required", reqID)
		return
	}

	count, err := h.uc.PreviewExport(r.Context(), tenantID, dateFrom, dateTo)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", map[string]int{"count": count}, reqID)
}

// Export attendance records as CSV or XLSX file.
func (h *AttendanceHandler) Export(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	q := r.URL.Query()
	dateFrom := q.Get("date_from")
	dateTo := q.Get("date_to")
	format := q.Get("format")

	if dateFrom == "" || dateTo == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "date_from and date_to are required", reqID)
		return
	}

	attendances, err := h.uc.GetReportExport(r.Context(), tenantID, dateFrom, dateTo)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	switch format {
	case "csv":
		h.exportCSV(w, attendances)
	case "xlsx", "":
		h.exportXLSX(w, attendances)
	default:
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody,
			"Unsupported format. Use 'csv' or 'xlsx'", reqID)
	}
}

func (h *AttendanceHandler) exportCSV(w http.ResponseWriter, attendances []domain.Attendance) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=attendance_export_%s.csv", time.Now().Format("20060102_150405")))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Header
	writer.Write([]string{"employee_code", "employee_name", "date", "clock_in", "clock_out", "status", "notes"})

	// Rows
	for _, a := range attendances {
		clockIn := a.ClockIn.Format("15:04:05")
		clockOut := ""
		if a.ClockOut != nil {
			clockOut = a.ClockOut.Format("15:04:05")
		}
		writer.Write([]string{
			a.EmployeeCode,
			a.EmployeeName,
			a.ClockDate,
			clockIn,
			clockOut,
			string(a.Status),
			a.Notes,
		})
	}
}

func (h *AttendanceHandler) exportXLSX(w http.ResponseWriter, attendances []domain.Attendance) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Attendance"
	f.SetSheetName("Sheet1", sheet)

	// Header style
	headers := []string{"employee_code", "employee_name", "date", "clock_in", "clock_out", "status", "notes"}
	for i, h := range headers {
		col := string(rune('A' + i))
		f.SetCellValue(sheet, col+"1", h)
	}

	// Data rows
	for i, a := range attendances {
		row := i + 2
		clockIn := a.ClockIn.Format("15:04:05")
		clockOut := ""
		if a.ClockOut != nil {
			clockOut = a.ClockOut.Format("15:04:05")
		}
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), a.EmployeeCode)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), a.EmployeeName)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), a.ClockDate)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), clockIn)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), clockOut)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), string(a.Status))
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), a.Notes)
	}

	// Auto-fit column widths
	f.SetColWidth(sheet, "A", "G", 20)

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=attendance_export_%s.xlsx", time.Now().Format("20060102_150405")))

	if err := f.Write(w); err != nil {
		// Can't change headers/status after writing, log error
		return
	}
}
