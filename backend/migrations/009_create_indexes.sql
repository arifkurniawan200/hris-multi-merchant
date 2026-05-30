-- 009_create_indexes.sql
-- Performance indexes for soft-delete queries

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON tenants(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_tenants_deleted_at ON user_tenants(deleted_at) WHERE deleted_at IS NOT NULL;
