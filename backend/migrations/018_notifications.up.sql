CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    type            VARCHAR(50) NOT NULL, -- 'leave_submitted', 'leave_approved', 'leave_rejected', 'overtime_submitted', 'overtime_approved', 'overtime_rejected'
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    reference_type  VARCHAR(50),          -- 'leave', 'overtime'
    reference_id    UUID,                  -- leave_id or overtime_id
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE AND deleted_at IS NULL;
CREATE INDEX idx_notifications_user_all ON notifications(tenant_id, user_id, created_at DESC);
