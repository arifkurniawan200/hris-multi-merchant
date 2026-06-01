-- Shift Swaps: employee-to-employee shift exchange
-- Workflow: employee A requests swap with employee B → manager approves/rejects

CREATE TABLE IF NOT EXISTS shift_swaps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    
    -- Requester: employee yang minta tukar shift
    requester_employee_id   UUID NOT NULL REFERENCES employees(id),
    requester_date          DATE NOT NULL,  -- tanggal yang mau ditukar
    
    -- Target: employee yang diajak tukar
    target_employee_id      UUID NOT NULL REFERENCES employees(id),
    target_date             DATE NOT NULL,  -- tanggal swap dari target
    
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    reason              TEXT,                 -- alasan requester minta swap
    rejection_reason    TEXT,                 -- alasan manager reject
    
    reviewed_by         UUID REFERENCES employees(id),  -- manager yang approve/reject
    reviewed_at         TIMESTAMPTZ,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_shift_swaps_tenant ON shift_swaps(tenant_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_shift_swaps_requester ON shift_swaps(requester_employee_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_shift_swaps_target ON shift_swaps(target_employee_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_shift_swaps_status ON shift_swaps(tenant_id, status, deleted_at) WHERE deleted_at IS NULL;
