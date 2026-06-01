CREATE TABLE IF NOT EXISTS leave_requests (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id),
    employee_id    UUID NOT NULL REFERENCES employees(id),
    leave_type_id  UUID NOT NULL REFERENCES leave_types(id),
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    total_days     NUMERIC(4,1) NOT NULL,
    reason         TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected','cancelled','taken','completed')),
    reviewed_by    UUID REFERENCES employees(id),
    reviewed_at    TIMESTAMPTZ,
    reject_reason  TEXT,
    cancelled_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ,

    CONSTRAINT chk_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_employee
    ON leave_requests(employee_id, start_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_leave_requests_tenant_status
    ON leave_requests(tenant_id, status, start_date) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_leave_requests_no_overlap
    ON leave_requests(employee_id, start_date, end_date)
    WHERE deleted_at IS NULL AND status NOT IN ('rejected','cancelled');

CREATE INDEX idx_leave_requests_reviewed_by
    ON leave_requests(reviewed_by, reviewed_at DESC) WHERE deleted_at IS NULL;
