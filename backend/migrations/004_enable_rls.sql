-- RLS policies for tenants, users, user_tenants

-- Enable RLS on tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- Policy: tenants can only access own rows unless super_admin
CREATE POLICY tenant_isolation ON tenants
    USING (id = current_setting('app.current_tenant', true)::uuid);

-- Policy: user_tenants rows scoped to current tenant
CREATE POLICY user_tenant_isolation ON user_tenants
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Policy: users table via user_tenants
CREATE POLICY user_isolation ON users
    USING (
        id IN (
            SELECT user_id FROM user_tenants
            WHERE tenant_id = current_setting('app.current_tenant', true)::uuid
        )
    );
