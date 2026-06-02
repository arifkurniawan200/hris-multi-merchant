CREATE TABLE IF NOT EXISTS asset_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    category_id     UUID NOT NULL REFERENCES asset_categories(id),
    asset_code      VARCHAR(50) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    brand           VARCHAR(100),
    model           VARCHAR(100),
    serial_number   VARCHAR(100),
    purchase_date   DATE,
    purchase_price  DECIMAL(15,2),
    condition       VARCHAR(20) NOT NULL DEFAULT 'good',
    status          VARCHAR(20) NOT NULL DEFAULT 'available',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, asset_code)
);

CREATE TABLE IF NOT EXISTS asset_assignments (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL REFERENCES tenants(id),
    asset_id                 UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    employee_id              UUID NOT NULL REFERENCES employees(id),
    assigned_by              UUID NOT NULL REFERENCES users(id),
    assigned_at              DATE NOT NULL DEFAULT CURRENT_DATE,
    returned_at              DATE,
    condition_at_assignment  VARCHAR(20) NOT NULL DEFAULT 'good',
    condition_at_return      VARCHAR(20),
    notes                    TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_categories_tenant ON asset_categories(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_tenant ON assets(tenant_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_status ON assets(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assignments_employee ON asset_assignments(tenant_id, employee_id);
