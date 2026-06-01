CREATE TABLE employee_documents (
    id              UUID PRIMARY KEY,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    document_type   TEXT NOT NULL CHECK (document_type IN ('ktp','npwp','bpjs_health','bpjs_labor','ijazah','certificate','contract','other')),
    document_name   TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    file_size       BIGINT NOT NULL,
    mime_type       TEXT NOT NULL DEFAULT 'application/octet-stream',
    file_path       TEXT NOT NULL,
    notes           TEXT,
    uploaded_by     UUID REFERENCES users(id),
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    verified_by     UUID REFERENCES users(id),
    verified_at     TIMESTAMPTZ,
    expires_at      DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_emp_docs_employee     ON employee_documents(employee_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_emp_docs_tenant       ON employee_documents(tenant_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_emp_docs_type         ON employee_documents(employee_id, document_type) WHERE deleted_at IS NULL;
