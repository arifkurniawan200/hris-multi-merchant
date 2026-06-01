CREATE TABLE IF NOT EXISTS announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    department_id   UUID REFERENCES departments(id),
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at       TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS announcement_reads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcements_tenant ON announcements(tenant_id, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_pinned ON announcements(tenant_id, is_pinned) WHERE is_pinned = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_announcements_dept ON announcements(tenant_id, department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id, announcement_id);
