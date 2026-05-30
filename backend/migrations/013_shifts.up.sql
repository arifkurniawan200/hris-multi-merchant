-- 013_shifts.up.sql
-- Shift templates (admin-defined per tenant)
CREATE TABLE IF NOT EXISTS shifts (
    id                              UUID PRIMARY KEY,
    tenant_id                       UUID NOT NULL REFERENCES tenants(id),
    name                            TEXT NOT NULL,           -- "Shift Pagi", "Shift Malam"
    code                            TEXT NOT NULL,           -- "PAGI", "MALAM"
    start_time                      TIME NOT NULL,           -- 07:00
    end_time                        TIME NOT NULL,           -- 15:00
    grace_minutes                   INT NOT NULL DEFAULT 15, -- toleransi keterlambatan
    clockin_window_before_minutes   INT NOT NULL DEFAULT 60, -- bisa clock-in sebelum start_time
    clockout_window_after_minutes   INT NOT NULL DEFAULT 60, -- bisa clock-out setelah end_time
    is_flexible                     BOOLEAN NOT NULL DEFAULT false, -- skip window validation
    color                           TEXT,                    -- buat kalender UI
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at                      TIMESTAMPTZ,

    UNIQUE(tenant_id, code)
);

-- Partial index for active shifts per tenant
CREATE INDEX IF NOT EXISTS idx_shifts_tenant_active
    ON shifts (tenant_id) WHERE deleted_at IS NULL;
