CREATE TABLE IF NOT EXISTS attendances (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    clock_in    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clock_out   TIMESTAMPTZ,
    clock_date  DATE NOT NULL,           -- pre-computed for fast filtering
    status      VARCHAR(20) NOT NULL DEFAULT 'present',  -- present, late, half_day, absent
    notes       TEXT,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    selfie_url  TEXT,                     -- anti-buddy-punching photo
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

-- CRITICAL: prevents double clock-in per employee per day
CREATE UNIQUE INDEX idx_attendances_employee_date 
    ON attendances(employee_id, clock_date) WHERE deleted_at IS NULL;

-- Fast tenant report: "all attendance for tenant X on date Y"
CREATE INDEX idx_attendances_tenant_date 
    ON attendances(tenant_id, clock_date, employee_id) WHERE deleted_at IS NULL;

-- Employee history (most recent first)
CREATE INDEX idx_attendances_employee_date_desc 
    ON attendances(employee_id, clock_date DESC) WHERE deleted_at IS NULL;
