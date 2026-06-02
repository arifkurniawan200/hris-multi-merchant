import { api } from './api';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_price_per_employee: number;
  subscription_expires_at: string | null;
  is_active: boolean;
  max_employees: number;
  employee_count?: number;
  settings: Record<string, unknown>;
  logo_url: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithTenant {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  role: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_id: string;
}

export interface CreateTenantData {
  name: string;
  slug: string;
  plan: string;
  price_per_employee: number;
}

export async function fetchAllTenants(limit = 100, offset = 0): Promise<Tenant[]> {
  return api.get<Tenant[]>(`/api/v1/admin/tenants?limit=${limit}&offset=${offset}`);
}

export async function fetchTenantDetail(id: string): Promise<Tenant> {
  return api.get<Tenant>(`/api/v1/admin/tenants/${id}`);
}

export async function createTenant(data: CreateTenantData): Promise<Tenant> {
  return api.post<Tenant>('/api/v1/admin/tenants', data);
}

export async function activateTenant(id: string): Promise<void> {
  return api.put<void>(`/api/v1/admin/tenants/${id}/activate`);
}

export async function deactivateTenant(id: string): Promise<void> {
  return api.put<void>(`/api/v1/admin/tenants/${id}/deactivate`);
}

export async function extendTenant(id: string, months: number): Promise<void> {
  return api.put<void>(`/api/v1/admin/tenants/${id}/extend`, { months });
}

export async function changeTenantPlan(id: string, plan: string, pricePerEmployee: number): Promise<void> {
  return api.put<void>(`/api/v1/admin/tenants/${id}/plan`, { plan, price_per_employee: pricePerEmployee });
}

export async function deleteTenant(id: string): Promise<void> {
  return api.del<void>(`/api/v1/admin/tenants/${id}`);
}

export async function fetchAllUsers(): Promise<UserWithTenant[]> {
  return api.get<UserWithTenant[]>('/api/v1/admin/users');
}

export interface UpdateRoleData {
  role: string;
  tenant_id: string;
}

export async function updateUserRole(userId: string, data: UpdateRoleData): Promise<void> {
  return api.put<void>(`/api/v1/admin/users/${userId}/role`, data);
}
