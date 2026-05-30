package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
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

	dept, err := h.uc.Create(&req)
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

	dept, err := h.uc.Get(id)
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

	depts, err := h.uc.List(tenantID, parentID)
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

	dept, err := h.uc.Get(id)
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

	if err := h.uc.Update(dept); err != nil {
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

	if err := h.uc.SoftDelete(id); err != nil {
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

	pos, err := h.uc.Create(&req)
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

	pos, err := h.uc.Get(id)
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

	positions, err := h.uc.List(tenantID)
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

	pos, err := h.uc.Get(id)
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

	if err := h.uc.Update(pos); err != nil {
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

	if err := h.uc.SoftDelete(id); err != nil {
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

	emp, err := h.uc.Create(&req)
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

	emp, err := h.uc.Get(id)
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

	result, err := h.uc.List(tenantID, filter)
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

	emp, err := h.uc.Get(id)
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

	if err := h.uc.Update(emp); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	// Refetch for joined fields
	updated, _ := h.uc.Get(id)
	response.JSON(w, http.StatusOK, "Employee updated", updated, reqID)
}

func (h *EmployeeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	id := r.PathValue("id")
	if id == "" {
		response.Err(w, http.StatusBadRequest, response.ErrMissingParam, "Missing employee ID", reqID)
		return
	}

	if err := h.uc.SoftDelete(id); err != nil {
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

	if err := h.uc.ChangeStatus(id, req.Status); err != nil {
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

	departments, err := h.deptUC.List(tenantID, nil)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	empResult, err := h.uc.List(tenantID, domain.EmployeeFilter{
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
