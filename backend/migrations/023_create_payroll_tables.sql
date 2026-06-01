CREATE TABLE IF NOT EXISTS payroll_configs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
    daily_salary_ratio INT NOT NULL DEFAULT 25,
    late_penalty_amount BIGINT NOT NULL DEFAULT 0,
    absent_penalty_amount BIGINT NOT NULL DEFAULT 0,
    overtime_rate INT NOT NULL DEFAULT 150,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payrolls (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    base_salary BIGINT NOT NULL DEFAULT 0,
    overtime_pay BIGINT NOT NULL DEFAULT 0,
    late_deduction BIGINT NOT NULL DEFAULT 0,
    absent_deduction BIGINT NOT NULL DEFAULT 0,
    leave_deduction BIGINT NOT NULL DEFAULT 0,
    reimbursement BIGINT NOT NULL DEFAULT 0,
    net_salary BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    notes TEXT DEFAULT '',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(employee_id, period_year, period_month)
);

CREATE INDEX idx_payroll_tenant_period ON payrolls(tenant_id, period_year, period_month, deleted_at);
CREATE INDEX idx_payroll_employee ON payrolls(employee_id, deleted_at);
