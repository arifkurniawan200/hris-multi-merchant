CREATE TABLE positions (
    id            UUID PRIMARY KEY,
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    name          TEXT NOT NULL,
    code          TEXT NOT NULL,
    description   TEXT,
    grade         TEXT CHECK (grade IN ('I','II','III','IV','V','VI','VII','VIII','IX','X')),
    min_salary    BIGINT,
    max_salary    BIGINT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_positions_tenant ON positions(tenant_id) WHERE deleted_at IS NULL;
