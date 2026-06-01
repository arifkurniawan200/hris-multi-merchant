CREATE TABLE IF NOT EXISTS attendance_corrections (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    attendance_id UUID NOT NULL REFERENCES attendances(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('clock_in', 'clock_out', 'both')),
    clock_date DATE NOT NULL,
    current_clock_in TIMESTAMPTZ,
    requested_clock_in TIMESTAMPTZ,
    current_clock_out TIMESTAMPTZ,
    requested_clock_out TIMESTAMPTZ,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    reject_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_att_corr_tenant_status ON attendance_corrections(tenant_id, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_att_corr_employee ON attendance_corrections(employee_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_att_corr_attendance ON attendance_corrections(attendance_id, deleted_at);
