CREATE TABLE IF NOT EXISTS leave_types (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id),
    name                 TEXT NOT NULL,
    code                 TEXT NOT NULL,
    default_days_per_year INT NOT NULL DEFAULT 12,
    max_consecutive_days  INT NOT NULL DEFAULT 0,
    is_paid              BOOLEAN NOT NULL DEFAULT true,
    color                TEXT DEFAULT '#4f46e5',
    description          TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,
    UNIQUE(tenant_id, code)
);

COMMENT ON COLUMN leave_types.default_days_per_year IS 'Default annual allocation per employee';
COMMENT ON COLUMN leave_types.max_consecutive_days IS 'Max consecutive days allowed. 0 = no limit';
