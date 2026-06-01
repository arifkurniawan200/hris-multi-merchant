package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/response"
)

type AssetHandler struct {
	catUC domain.AssetCategoryUseCase
	uc    domain.AssetUseCase
}

func NewAssetHandler(catUC domain.AssetCategoryUseCase, uc domain.AssetUseCase) *AssetHandler {
	return &AssetHandler{catUC: catUC, uc: uc}
}

// ── Category ────────────────────────────────────────

func (h *AssetHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)

	var req domain.CreateAssetCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid request body", reqID)
		return
	}

	cat, err := h.catUC.Create(r.Context(), tenantID, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Category created", cat, reqID)
}

func (h *AssetHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)

	items, err := h.catUC.List(r.Context(), tenantID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", items, reqID)
}

func (h *AssetHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	id := r.PathValue("id")

	var req domain.UpdateAssetCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid request body", reqID)
		return
	}

	cat, err := h.catUC.Update(r.Context(), tenantID, id, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Category updated", cat, reqID)
}

func (h *AssetHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	id := r.PathValue("id")

	if err := h.catUC.Delete(r.Context(), tenantID, id); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Category deleted", nil, reqID)
}

// ── Assets ──────────────────────────────────────────

func (h *AssetHandler) Create(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)

	var req domain.CreateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid request body", reqID)
		return
	}

	a, err := h.uc.Create(r.Context(), tenantID, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Asset created", a, reqID)
}

func (h *AssetHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	id := r.PathValue("id")

	a, err := h.uc.GetByID(r.Context(), tenantID, id)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", a, reqID)
}

func (h *AssetHandler) List(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}

	filter := domain.AssetFilter{
		Limit:  limit,
		Offset: offset,
	}

	if catID := r.URL.Query().Get("category_id"); catID != "" {
		filter.CategoryID = &catID
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter.Status = &status
	}
	if cond := r.URL.Query().Get("condition"); cond != "" {
		filter.Condition = &cond
	}
	if search := r.URL.Query().Get("search"); search != "" {
		filter.Search = search
	}

	items, total, err := h.uc.List(r.Context(), tenantID, filter)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", map[string]interface{}{
		"data":   items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}, reqID)
}

func (h *AssetHandler) Update(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	id := r.PathValue("id")

	var req domain.UpdateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid request body", reqID)
		return
	}

	a, err := h.uc.Update(r.Context(), tenantID, id, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Asset updated", a, reqID)
}

func (h *AssetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	id := r.PathValue("id")

	if err := h.uc.Delete(r.Context(), tenantID, id); err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Asset deleted", nil, reqID)
}

// ── Assignments ─────────────────────────────────────

func (h *AssetHandler) Assign(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	var req domain.CreateAssignmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid request body", reqID)
		return
	}

	assignment, err := h.uc.Assign(r.Context(), tenantID, userID, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Asset assigned", assignment, reqID)
}

func (h *AssetHandler) ReturnAsset(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	id := r.PathValue("id")

	var req domain.ReturnAssignmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Err(w, http.StatusBadRequest, response.ErrValidation, "Invalid request body", reqID)
		return
	}

	assignment, err := h.uc.ReturnAsset(r.Context(), tenantID, id, &req)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Asset returned", assignment, reqID)
}

func (h *AssetHandler) ListAssignments(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}

	filter := domain.AssignmentFilter{
		Limit:  limit,
		Offset: offset,
	}

	if assetID := r.URL.Query().Get("asset_id"); assetID != "" {
		filter.AssetID = &assetID
	}
	if empID := r.URL.Query().Get("employee_id"); empID != "" {
		filter.EmployeeID = &empID
	}
	if r.URL.Query().Get("active") == "true" {
		filter.ActiveOnly = true
	}

	items, total, err := h.uc.GetAssignments(r.Context(), tenantID, filter)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", map[string]interface{}{
		"data":   items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}, reqID)
}

// ── Employee Self-Service ───────────────────────────

func (h *AssetHandler) MyAssets(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(string)
	userID, _ := r.Context().Value(middleware.CtxUserID).(string)

	items, err := h.uc.GetMyAssets(r.Context(), tenantID, userID)
	if err != nil {
		handleDomainErr(w, r, err)
		return
	}

	response.JSON(w, http.StatusOK, "Success", items, reqID)
}
