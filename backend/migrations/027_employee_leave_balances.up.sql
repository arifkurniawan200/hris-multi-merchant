CREATE TABLE IF NOT EXISTS employee_leave_balances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    leave_type_id   UUID NOT NULL REFERENCES leave_types(id),
    year            INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    allocated_days  INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    UNIQUE(employee_id, leave_type_id, year),
    CONSTRAINT chk_allocated_days CHECK (allocated_days >= 0)
);

CREATE INDEX idx_leave_balances_tenant ON employee_leave_balances(tenant_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_balances_employee ON employee_leave_balances(employee_id, year, deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE employee_leave_balances IS 'Per-employee annual leave allocation override. Falls back to leave_types.default_days_per_year if no row exists.';
