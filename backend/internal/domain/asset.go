package domain

import (
	"context"
	"time"
)

// ── Asset Category ──────────────────────────────────

type AssetCategory struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenant_id"`
	Name        string     `json:"name"`
	Description *string    `json:"description,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}

type CreateAssetCategoryRequest struct {
	Name        string  `json:"name" validate:"required,min=2,max=100"`
	Description *string `json:"description,omitempty"`
}

type UpdateAssetCategoryRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
}

// ── Asset ───────────────────────────────────────────

type Asset struct {
	ID            string     `json:"id"`
	TenantID      string     `json:"tenant_id"`
	CategoryID    string     `json:"category_id"`
	AssetCode     string     `json:"asset_code"`
	Name          string     `json:"name"`
	Brand         *string    `json:"brand,omitempty"`
	Model         *string    `json:"model,omitempty"`
	SerialNumber  *string    `json:"serial_number,omitempty"`
	PurchaseDate  *string    `json:"purchase_date,omitempty"`
	PurchasePrice *float64   `json:"purchase_price,omitempty"`
	Condition     string     `json:"condition"`
	Status        string     `json:"status"`
	Notes         *string    `json:"notes,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`

	// Joined fields
	CategoryName string `json:"category_name,omitempty"`
	CurrentHolder string `json:"current_holder,omitempty"`
}

type CreateAssetRequest struct {
	CategoryID    string   `json:"category_id" validate:"required,uuid"`
	AssetCode     string   `json:"asset_code" validate:"required,max=50"`
	Name          string   `json:"name" validate:"required,min=2,max=200"`
	Brand         *string  `json:"brand,omitempty"`
	Model         *string  `json:"model,omitempty"`
	SerialNumber  *string  `json:"serial_number,omitempty"`
	PurchaseDate  *string  `json:"purchase_date,omitempty"`
	PurchasePrice *float64 `json:"purchase_price,omitempty"`
	Condition     string   `json:"condition" validate:"required,oneof=good fair damaged"`
	Status        string   `json:"status" validate:"oneof=available assigned maintenance retired"`
	Notes         *string  `json:"notes,omitempty"`
}

type UpdateAssetRequest struct {
	CategoryID    *string  `json:"category_id,omitempty"`
	AssetCode     *string  `json:"asset_code,omitempty"`
	Name          *string  `json:"name,omitempty"`
	Brand         *string  `json:"brand,omitempty"`
	Model         *string  `json:"model,omitempty"`
	SerialNumber  *string  `json:"serial_number,omitempty"`
	PurchaseDate  *string  `json:"purchase_date,omitempty"`
	PurchasePrice *float64 `json:"purchase_price,omitempty"`
	Condition     *string  `json:"condition,omitempty"`
	Status        *string  `json:"status,omitempty"`
	Notes         *string  `json:"notes,omitempty"`
}

type AssetFilter struct {
	TenantID   string
	CategoryID *string
	Status     *string
	Condition  *string
	Search     string
	Limit      int
	Offset     int
}

// ── Asset Assignments ───────────────────────────────

type AssetAssignment struct {
	ID                    string     `json:"id"`
	TenantID              string     `json:"tenant_id"`
	AssetID               string     `json:"asset_id"`
	EmployeeID            string     `json:"employee_id"`
	AssignedBy            string     `json:"assigned_by"`
	AssignedAt            string     `json:"assigned_at"`
	ReturnedAt            *string    `json:"returned_at,omitempty"`
	ConditionAtAssignment string     `json:"condition_at_assignment"`
	ConditionAtReturn     *string    `json:"condition_at_return,omitempty"`
	Notes                 *string    `json:"notes,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`

	// Joined
	AssetName    string `json:"asset_name,omitempty"`
	AssetCode    string `json:"asset_code,omitempty"`
	EmployeeName string `json:"employee_name,omitempty"`
}

type CreateAssignmentRequest struct {
	AssetID               string  `json:"asset_id" validate:"required,uuid"`
	EmployeeID            string  `json:"employee_id" validate:"required,uuid"`
	ConditionAtAssignment string  `json:"condition_at_assignment" validate:"required,oneof=good fair damaged"`
	Notes                 *string `json:"notes,omitempty"`
}

type ReturnAssignmentRequest struct {
	ReturnedAt        *string `json:"returned_at,omitempty"`
	ConditionAtReturn *string `json:"condition_at_return,omitempty"`
	Notes             *string `json:"notes,omitempty"`
}

type AssignmentFilter struct {
	TenantID   string
	AssetID    *string
	EmployeeID *string
	ActiveOnly bool
	Limit      int
	Offset     int
}

// ── Repositories ────────────────────────────────────

type AssetCategoryRepository interface {
	Create(ctx context.Context, tenantID string, cat *AssetCategory) error
	GetByID(ctx context.Context, tenantID, id string) (*AssetCategory, error)
	List(ctx context.Context, tenantID string) ([]AssetCategory, error)
	Update(ctx context.Context, cat *AssetCategory) error
	Delete(ctx context.Context, tenantID, id string) error
}

type AssetRepository interface {
	Create(ctx context.Context, a *Asset) error
	GetByID(ctx context.Context, tenantID, id string) (*Asset, error)
	List(ctx context.Context, filter AssetFilter) ([]Asset, int, error)
	GetByCode(ctx context.Context, tenantID, code string) (*Asset, error)
	Update(ctx context.Context, a *Asset) error
	UpdateStatus(ctx context.Context, id, status string) error
	Delete(ctx context.Context, tenantID, id string) error
}

type AssetAssignmentRepository interface {
	Create(ctx context.Context, a *AssetAssignment) error
	GetByID(ctx context.Context, tenantID, id string) (*AssetAssignment, error)
	List(ctx context.Context, filter AssignmentFilter) ([]AssetAssignment, int, error)
	GetActiveByAssetID(ctx context.Context, assetID string) (*AssetAssignment, error)
	GetActiveByEmployeeID(ctx context.Context, tenantID, employeeID string) ([]AssetAssignment, error)
	Return(ctx context.Context, id, returnedAt string, conditionAtReturn *string, notes *string) error
}

// ── Use Cases ───────────────────────────────────────

type AssetCategoryUseCase interface {
	Create(ctx context.Context, tenantID string, req *CreateAssetCategoryRequest) (*AssetCategory, error)
	GetByID(ctx context.Context, tenantID, id string) (*AssetCategory, error)
	List(ctx context.Context, tenantID string) ([]AssetCategory, error)
	Update(ctx context.Context, tenantID, id string, req *UpdateAssetCategoryRequest) (*AssetCategory, error)
	Delete(ctx context.Context, tenantID, id string) error
}

type AssetUseCase interface {
	Create(ctx context.Context, tenantID string, req *CreateAssetRequest) (*Asset, error)
	GetByID(ctx context.Context, tenantID, id string) (*Asset, error)
	List(ctx context.Context, tenantID string, filter AssetFilter) ([]Asset, int, error)
	Update(ctx context.Context, tenantID, id string, req *UpdateAssetRequest) (*Asset, error)
	Delete(ctx context.Context, tenantID, id string) error
	Assign(ctx context.Context, tenantID, assignedBy string, req *CreateAssignmentRequest) (*AssetAssignment, error)
	ReturnAsset(ctx context.Context, tenantID, assignmentID string, req *ReturnAssignmentRequest) (*AssetAssignment, error)
	GetAssignments(ctx context.Context, tenantID string, filter AssignmentFilter) ([]AssetAssignment, int, error)
	GetMyAssets(ctx context.Context, tenantID, userID string) ([]AssetAssignment, error)
}
