package handler

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
	"github.com/xuri/excelize/v2"
)

// ── Department Handler ──────────────────────────

type DepartmentHandler struct {
	uc domain.DepartmentUseCase
}

func NewDepartmentHandler(uc domain.DepartmentUseCase) *DepartmentHandler {
	return &DepartmentHandler{uc: uc}
}

type updateDeptReq struct {
	Name        string  `json:"name"`
	Code        string  `json:"code"`
	Description string  `json:"description"`
	ManagerID   *string `json:"manager_id"`
	ParentID    *string `json:"parent_id"`
	IsActive    *bool   `json:"is_active"`
}

func (h *DepartmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var req domain.CreateDepartmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}
	req.TenantID = tenantID

	dept, err := h.uc.Create(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Department created", dept, reqID)
}

func (h *DepartmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing department ID", reqID)
		return
	}

	dept, err := h.uc.Get(r.Context(), id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", dept, reqID)
}

func (h *DepartmentHandler) List(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var parentID *string
	if pid := r.URL.Query().Get("parent_id"); pid != "" {
		parentID = &pid
	}

	depts, err := h.uc.List(r.Context(), tenantID, parentID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", depts, reqID)
}

func (h *DepartmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing department ID", reqID)
		return
	}

	dept, err := h.uc.Get(r.Context(), id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	var req updateDeptReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	if req.Name != "" {
		dept.Name = req.Name
	}
	if req.Code != "" {
		dept.Code = req.Code
	}
	dept.Description = req.Description
	dept.ManagerID = req.ManagerID
	dept.ParentID = req.ParentID
	if req.IsActive != nil {
		dept.IsActive = *req.IsActive
	}

	if err := h.uc.Update(r.Context(), dept); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Department updated", dept, reqID)
}

func (h *DepartmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing department ID", reqID)
		return
	}

	if err := h.uc.SoftDelete(r.Context(), id); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Department deleted", map[string]string{"status": "deleted"}, reqID)
}

// ── Position Handler ────────────────────────────

type PositionHandler struct {
	uc domain.PositionUseCase
}

func NewPositionHandler(uc domain.PositionUseCase) *PositionHandler {
	return &PositionHandler{uc: uc}
}

type updatePosReq struct {
	Name        string  `json:"name"`
	Code        string  `json:"code"`
	Description string  `json:"description"`
	Grade       *string `json:"grade"`
	MinSalary   *int64  `json:"min_salary"`
	MaxSalary   *int64  `json:"max_salary"`
	IsActive    *bool   `json:"is_active"`
}

func (h *PositionHandler) Create(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var req domain.CreatePositionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}
	req.TenantID = tenantID

	pos, err := h.uc.Create(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Position created", pos, reqID)
}

func (h *PositionHandler) Get(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing position ID", reqID)
		return
	}

	pos, err := h.uc.Get(r.Context(), id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", pos, reqID)
}

func (h *PositionHandler) List(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	positions, err := h.uc.List(r.Context(), tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", positions, reqID)
}

func (h *PositionHandler) Update(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing position ID", reqID)
		return
	}

	pos, err := h.uc.Get(r.Context(), id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	var req updatePosReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	if req.Name != "" {
		pos.Name = req.Name
	}
	if req.Code != "" {
		pos.Code = req.Code
	}
	pos.Description = req.Description
	if req.Grade != nil {
		pos.Grade = *req.Grade
	}
	if req.MinSalary != nil {
		pos.MinSalary = *req.MinSalary
	}
	if req.MaxSalary != nil {
		pos.MaxSalary = *req.MaxSalary
	}
	if req.IsActive != nil {
		pos.IsActive = *req.IsActive
	}

	if err := h.uc.Update(r.Context(), pos); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Position updated", pos, reqID)
}

func (h *PositionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing position ID", reqID)
		return
	}

	if err := h.uc.SoftDelete(r.Context(), id); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Position deleted", map[string]string{"status": "deleted"}, reqID)
}

// ── Employee Handler ────────────────────────────

type EmployeeHandler struct {
	uc     domain.EmployeeUseCase
	deptUC domain.DepartmentUseCase
	posUC  domain.PositionUseCase
}

func NewEmployeeHandler(
	uc domain.EmployeeUseCase,
	deptUC domain.DepartmentUseCase,
	posUC domain.PositionUseCase,
) *EmployeeHandler {
	return &EmployeeHandler{uc: uc, deptUC: deptUC, posUC: posUC}
}

type updateEmpReq struct {
	FirstName        string       `json:"first_name"`
	LastName         string       `json:"last_name"`
	Gender           *string      `json:"gender"`
	BirthDate        *string      `json:"birth_date"`
	BirthPlace       *string      `json:"birth_place"`
	Email            *string      `json:"email"`
	Phone            *string      `json:"phone"`
	Address          *string      `json:"address"`
	DepartmentID     *string      `json:"department_id"`
	PositionID       *string      `json:"position_id"`
	ManagerID        *string      `json:"manager_id"`
	EmploymentStatus *string      `json:"employment_status"`
	EmploymentType   *string      `json:"employment_type"`
	JoinDate         *string      `json:"join_date"`
	ResignDate       *string      `json:"resign_date"`
	ContractStart    *string      `json:"contract_start"`
	ContractEnd      *string      `json:"contract_end"`
	NationalID       *string      `json:"national_id"`
	TaxID            *string      `json:"tax_id"`
	BPJSHealth       *string      `json:"bpjs_health"`
	BPJSLabor        *string      `json:"bpjs_labor"`
	BaseSalary       *int64       `json:"base_salary"`
	BankName         *string      `json:"bank_name"`
	BankAccount      *string      `json:"bank_account"`
	CustomFields     domain.JSONB `json:"custom_fields"`
	Notes            *string      `json:"notes"`
}

func (h *EmployeeHandler) Create(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var req domain.CreateEmployeeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}
	req.TenantID = tenantID

	emp, err := h.uc.Create(r.Context(), &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Employee created", emp, reqID)
}

func (h *EmployeeHandler) Get(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing employee ID", reqID)
		return
	}

	emp, err := h.uc.Get(r.Context(), id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", emp, reqID)
}

func (h *EmployeeHandler) List(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	filter := domain.EmployeeFilter{
		Status:       q.Get("status"),
		DepartmentID: q.Get("department_id"),
		PositionID:   q.Get("position_id"),
		Search:       q.Get("search"),
		Limit:        limit,
		Offset:       offset,
	}

	result, err := h.uc.List(r.Context(), tenantID, filter)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", result, reqID)
}

func (h *EmployeeHandler) Update(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing employee ID", reqID)
		return
	}

	emp, err := h.uc.Get(r.Context(), id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	var req updateEmpReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	// Apply partial updates
	if req.FirstName != "" {
		emp.FirstName = req.FirstName
	}
	emp.LastName = req.LastName
	if req.Gender != nil {
		emp.Gender = *req.Gender
	}
	if req.BirthDate != nil {
		emp.BirthDate = req.BirthDate
	}
	if req.BirthPlace != nil {
		emp.BirthPlace = *req.BirthPlace
	}
	if req.Email != nil {
		emp.Email = *req.Email
	}
	if req.Phone != nil {
		emp.Phone = *req.Phone
	}
	if req.Address != nil {
		emp.Address = *req.Address
	}
	if req.DepartmentID != nil {
		emp.DepartmentID = req.DepartmentID
	}
	if req.PositionID != nil {
		emp.PositionID = req.PositionID
	}
	if req.ManagerID != nil {
		emp.ManagerID = req.ManagerID
	}
	if req.EmploymentStatus != nil {
		emp.EmploymentStatus = *req.EmploymentStatus
	}
	if req.EmploymentType != nil {
		emp.EmploymentType = *req.EmploymentType
	}
	if req.JoinDate != nil {
		emp.JoinDate = *req.JoinDate
	}
	if req.ResignDate != nil {
		emp.ResignDate = req.ResignDate
	}
	if req.ContractStart != nil {
		emp.ContractStart = req.ContractStart
	}
	if req.ContractEnd != nil {
		emp.ContractEnd = req.ContractEnd
	}
	if req.NationalID != nil {
		emp.NationalID = *req.NationalID
	}
	if req.TaxID != nil {
		emp.TaxID = *req.TaxID
	}
	if req.BPJSHealth != nil {
		emp.BPJSHealth = *req.BPJSHealth
	}
	if req.BPJSLabor != nil {
		emp.BPJSLabor = *req.BPJSLabor
	}
	if req.BaseSalary != nil {
		emp.BaseSalary = *req.BaseSalary
	}
	if req.BankName != nil {
		emp.BankName = *req.BankName
	}
	if req.BankAccount != nil {
		emp.BankAccount = *req.BankAccount
	}
	if req.CustomFields != nil {
		emp.CustomFields = req.CustomFields
	}
	if req.Notes != nil {
		emp.Notes = *req.Notes
	}

	if err := h.uc.Update(r.Context(), emp); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	// Refetch for joined fields
	updated, _ := h.uc.Get(r.Context(), id)
	response.JSON(w, http.StatusOK, "Employee updated", updated, reqID)
}

func (h *EmployeeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing employee ID", reqID)
		return
	}

	if err := h.uc.SoftDelete(r.Context(), id); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Employee deleted", map[string]string{"status": "deleted"}, reqID)
}

func (h *EmployeeHandler) ChangeStatus(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing employee ID", reqID)
		return
	}

	var req domain.ChangeEmployeeStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	if err := h.uc.ChangeStatus(r.Context(), id, req.Status); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Status updated", map[string]string{"status": "updated"}, reqID)
}

// ── Org Chart ───────────────────────────────────

func (h *EmployeeHandler) OrgChart(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	departments, err := h.deptUC.List(r.Context(), tenantID, nil)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	empResult, err := h.uc.List(r.Context(), tenantID, domain.EmployeeFilter{
		Status: "active",
		Limit:  1000,
		Offset: 0,
	})
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	type orgNode struct {
		Department *domain.Department `json:"department"`
		Employees  []domain.Employee  `json:"employees"`
	}

	empByDept := make(map[string][]domain.Employee)
	for _, e := range empResult.Data {
		if e.DepartmentID != nil {
			empByDept[*e.DepartmentID] = append(empByDept[*e.DepartmentID], e)
		}
	}

	var nodes []orgNode
	for _, d := range departments {
		emps := empByDept[d.ID]
		if emps == nil {
			emps = []domain.Employee{}
		}
		nodes = append(nodes, orgNode{Department: &d, Employees: emps})
	}

	response.JSON(w, http.StatusOK, "Success", map[string]interface{}{
		"departments":    nodes,
		"total_employees": empResult.Total,
	}, reqID)
}

// ── Bulk Import ─────────────────────────────────

func parseInt64(s string) int64 {
	if s == "" {
		return 0
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return 0
	}
	return v
}

// parseImportRow parses a map of column→value into a CreateEmployeeRequest.
func parseImportRow(cols map[string]string, rowNum int) (*domain.CreateEmployeeRequest, []string) {
	var errs []string

	req := &domain.CreateEmployeeRequest{
		EmployeeCode:     strings.TrimSpace(cols["employee_code"]),
		FirstName:        strings.TrimSpace(cols["first_name"]),
		LastName:         strings.TrimSpace(cols["last_name"]),
		Gender:           strings.TrimSpace(cols["gender"]),
		BirthPlace:       strings.TrimSpace(cols["birth_place"]),
		Email:            strings.TrimSpace(cols["email"]),
		Phone:            strings.TrimSpace(cols["phone"]),
		Address:          strings.TrimSpace(cols["address"]),
		EmploymentStatus: strings.TrimSpace(cols["employment_status"]),
		EmploymentType:   strings.TrimSpace(cols["employment_type"]),
		JoinDate:         strings.TrimSpace(cols["join_date"]),
		NationalID:       strings.TrimSpace(cols["national_id"]),
		TaxID:            strings.TrimSpace(cols["tax_id"]),
		BPJSHealth:       strings.TrimSpace(cols["bpjs_health"]),
		BPJSLabor:        strings.TrimSpace(cols["bpjs_labor"]),
		BankName:         strings.TrimSpace(cols["bank_name"]),
		BankAccount:      strings.TrimSpace(cols["bank_account"]),
		Notes:            strings.TrimSpace(cols["notes"]),
		BaseSalary:       parseInt64(cols["base_salary"]),
	}

	if bd := strings.TrimSpace(cols["birth_date"]); bd != "" {
		req.BirthDate = &bd
	}
	if dc := strings.TrimSpace(cols["department_code"]); dc != "" {
		req.DepartmentID = &dc
	}
	if pc := strings.TrimSpace(cols["position_code"]); pc != "" {
		req.PositionID = &pc
	}

	return req, errs
}

func (h *EmployeeHandler) ImportEmployees(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	// Parse multipart form — max 32MB
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Failed to parse multipart form", reqID)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing file field 'file'", reqID)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	var employees []*domain.CreateEmployeeRequest

	switch ext {
	case ".csv":
		employees, err = h.parseCSV(file)
	case ".xlsx":
		employees, err = h.parseXLSX(file)
	default:
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody,
			"Unsupported file format. Use .csv or .xlsx", reqID)
		return
	}
	if err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, err.Error(), reqID)
		return
	}

	result, err := h.uc.BulkImport(r.Context(), tenantID, employees)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Import completed", result, reqID)
}

// parseCSV reads a CSV file and returns employee requests.
func (h *EmployeeHandler) parseCSV(r io.Reader) ([]*domain.CreateEmployeeRequest, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true

	// Read header row
	headers, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV header: %v", err)
	}

	// Normalize header names
	headerMap := make(map[string]int)
	for i, h := range headers {
		headerMap[strings.TrimSpace(strings.ToLower(h))] = i
	}

	var employees []*domain.CreateEmployeeRequest
	lineNum := 2 // data starts at line 2
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("CSV parse error at line %d: %v", lineNum, err)
		}

		cols := make(map[string]string)
		for colName, idx := range headerMap {
			if idx < len(record) {
				cols[colName] = record[idx]
			}
		}

		req, _ := parseImportRow(cols, lineNum)
		employees = append(employees, req)
		lineNum++
	}

	return employees, nil
}

// parseXLSX reads an XLSX file and returns employee requests.
func (h *EmployeeHandler) parseXLSX(r io.Reader) ([]*domain.CreateEmployeeRequest, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, fmt.Errorf("failed to open XLSX: %v", err)
	}
	defer f.Close()

	sheet := f.GetSheetName(0)
	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, fmt.Errorf("failed to read XLSX sheet: %v", err)
	}

	if len(rows) < 2 {
		return nil, fmt.Errorf("XLSX file must have a header row and at least one data row")
	}

	// Normalize header names
	headers := rows[0]
	headerMap := make(map[string]int)
	for i, h := range headers {
		headerMap[strings.TrimSpace(strings.ToLower(h))] = i
	}

	var employees []*domain.CreateEmployeeRequest
	for rowNum := 1; rowNum < len(rows); rowNum++ {
		record := rows[rowNum]
		cols := make(map[string]string)
		for colName, idx := range headerMap {
			if idx < len(record) {
				cols[colName] = strings.TrimSpace(record[idx])
			}
		}

		req, _ := parseImportRow(cols, rowNum+1)
		employees = append(employees, req)
	}

	return employees, nil
}
