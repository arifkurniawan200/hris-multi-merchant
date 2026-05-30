package handler

import (
	"encoding/json"
	"net/http"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

type TenantHandler struct {
	tenantUC domain.TenantUseCase
}

func NewTenantHandler(tenantUC domain.TenantUseCase) *TenantHandler {
	return &TenantHandler{tenantUC: tenantUC}
}

type updateTenantReq struct {
	Name     string       `json:"name"`
	LogoURL  string       `json:"logo_url"`
	Settings domain.JSONB `json:"settings"`
}

func (h *TenantHandler) MyTenant(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	tenant, err := h.tenantUC.GetTenant(tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", tenant, reqID)
}

func (h *TenantHandler) UpdateMyTenant(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	if tenantID == "" {
		response.Err(w, http.StatusBadRequest, response.ErrNoTenantContext, "No tenant context", reqID)
		return
	}

	var req updateTenantReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	tenant, err := h.tenantUC.GetTenant(tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	tenant.Name = req.Name
	tenant.LogoURL = req.LogoURL
	tenant.Settings = req.Settings

	if err := h.tenantUC.UpdateTenant(tenant); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Tenant updated", tenant, reqID)
}

func (h *TenantHandler) ListAllTenants(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	tenants, err := h.tenantUC.ListTenants()
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", tenants, reqID)
}

func (h *TenantHandler) CreateByAdmin(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	var req domain.CreateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrInvalidBody, "Invalid request body", reqID)
		return
	}

	tenant, err := h.tenantUC.CreateTenant(&req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Tenant created", tenant, reqID)
}
