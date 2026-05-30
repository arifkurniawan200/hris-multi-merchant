CREATE TABLE employees (
    id                    UUID PRIMARY KEY,
    tenant_id             UUID NOT NULL REFERENCES tenants(id),
    user_id               UUID REFERENCES users(id),
    employee_code         TEXT NOT NULL,
    first_name            TEXT NOT NULL,
    last_name             TEXT,
    gender                TEXT CHECK (gender IN ('male','female')),
    birth_date            DATE,
    birth_place           TEXT,
    email                 TEXT NOT NULL,
    phone                 TEXT,
    address               TEXT,
    department_id         UUID REFERENCES departments(id),
    position_id           UUID REFERENCES positions(id),
    manager_id            UUID REFERENCES employees(id),
    employment_status     TEXT NOT NULL DEFAULT 'probation' CHECK (employment_status IN ('active','probation','resigned','terminated','suspended')),
    employment_type       TEXT NOT NULL DEFAULT 'permanent' CHECK (employment_type IN ('permanent','contract','intern','daily','freelance')),
    join_date             DATE NOT NULL,
    resign_date           DATE,
    contract_start        DATE,
    contract_end          DATE,
    national_id           TEXT,
    tax_id                TEXT,
    bpjs_health           TEXT,
    bpjs_labor            TEXT,
    base_salary           BIGINT,
    bank_name             TEXT,
    bank_account          TEXT,
    custom_fields         JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ,
    UNIQUE(tenant_id, employee_code)
);

-- Partial indexes for performance
CREATE INDEX idx_employees_tenant       ON employees(tenant_id)           WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_department   ON employees(tenant_id, department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_manager      ON employees(manager_id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_status       ON employees(tenant_id, employment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_join_date    ON employees(tenant_id, join_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_user         ON employees(user_id)            WHERE deleted_at IS NULL;
