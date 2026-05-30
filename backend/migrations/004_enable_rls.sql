-- Enable RLS on tenants and users tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- Policies for tenants table
CREATE POLICY tenant_owner_access ON tenants
FOR ALL TO public USING (id = current_setting('app.current_tenant', true)::uuid);

-- Policies for users table
CREATE POLICY user_tenant_access ON users
FOR ALL TO public USING (id = ANY(
  SELECT tenant_id FROM user_tenants WHERE user_id = current_setting('app.current_user_id', true)::uuid
));

-- Policies for user_tenants table
CREATE POLICY user_tenant_select ON user_tenants
FOR ALL TO public USING (user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY user_tenant_insert ON user_tenants
FOR ALL TO public WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);
