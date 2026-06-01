-- 015_overtime.up.sql
-- Overtime request & approval tracking
CREATE TABLE IF NOT EXISTS overtime_requests (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    date            DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    total_hours     NUMERIC(5,1) NOT NULL,
    reason          TEXT NOT NULL DEFAULT '',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by     UUID,
    reviewed_at     TIMESTAMPTZ,
    reject_reason   TEXT NOT NULL DEFAULT '',
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

-- List overtime requests by employee
CREATE INDEX IF NOT EXISTS idx_overtime_employee
    ON overtime_requests (employee_id, date DESC) WHERE deleted_at IS NULL;

-- List pending overtime for manager approval (by tenant)
CREATE INDEX IF NOT EXISTS idx_overtime_pending
    ON overtime_requests (tenant_id, status, created_at DESC) WHERE deleted_at IS NULL AND status = 'pending';

-- Count approved hours per date range (for payroll later)
CREATE INDEX IF NOT EXISTS idx_overtime_status_date
    ON overtime_requests (employee_id, status, date) WHERE deleted_at IS NULL AND status = 'approved';
