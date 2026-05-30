-- 014_employee_shifts.up.sql
-- Employee-to-shift assignment with effective date range (supports rotation)
CREATE TABLE IF NOT EXISTS employee_shifts (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    shift_id        UUID NOT NULL REFERENCES shifts(id),
    effective_from  DATE NOT NULL,            -- mulai berlaku
    effective_to    DATE,                     -- NULL = indefinite (shift saat ini)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- Prevent duplicate assignment on same effective_from date
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_shifts_active
    ON employee_shifts (employee_id, effective_from) WHERE deleted_at IS NULL;

-- Fast lookup: what shift is employee X on date Y?
CREATE INDEX IF NOT EXISTS idx_employee_shifts_lookup
    ON employee_shifts (employee_id, effective_from, effective_to) WHERE deleted_at IS NULL;

-- Fast lookup: all employees in shift X
CREATE INDEX IF NOT EXISTS idx_employee_shifts_by_shift
    ON employee_shifts (shift_id) WHERE deleted_at IS NULL;
