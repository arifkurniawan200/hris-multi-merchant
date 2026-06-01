"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Save,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  CreditCard,
  Globe,
  MapPin,
  Camera,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_price_per_employee: number;
  subscription_expires_at: string | null;
  is_active: boolean;
  max_employees: number;
  settings: Record<string, any>;
  logo_url: string;
  created_at: string;
}

export default function TenantSettingsPage() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [settings, setSettings] = useState({
    timezone: "Asia/Jakarta",
    date_format: "YYYY-MM-DD",
    currency: "IDR",
    enable_selfie_clockin: false,
    enable_location_tracking: false,
    enable_overtime: true,
    late_threshold_minutes: 15,
  });

  const [showRawJson, setShowRawJson] = useState(false);
  const [rawJson, setRawJson] = useState("{}");
  const [useRawJson, setUseRawJson] = useState(false);

  const isTenantAdmin = user?.role === "tenant_admin" || user?.role === "super_admin";

  useEffect(() => {
    loadTenant();
  }, []);

  async function loadTenant() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<Tenant>("/api/v1/tenants/me");
      setTenant(data);
      setName(data.name);
      setLogoUrl(data.logo_url || "");
      if (data.settings && typeof data.settings === "object") {
        setSettings((prev) => ({ ...prev, ...data.settings }));
        setRawJson(JSON.stringify(data.settings, null, 2));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  }

  function updateSetting(key: string, value: any) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload: any = { name };
      if (logoUrl) payload.logo_url = logoUrl;
      payload.settings = useRawJson ? JSON.parse(rawJson) : settings;

      await api.put("/api/v1/tenants/me", payload);
      setSuccess("Settings saved successfully");
      loadTenant();
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON in raw settings");
      } else {
        setError(err instanceof Error ? err.message : "Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  }

  const planBadge = (plan: string) => {
    const colors: Record<string, { variant: "info" | "warning" | "success" | "danger"; label: string }> = {
      free: { variant: "info", label: "Free" },
      pro: { variant: "warning", label: "Pro" },
      enterprise: { variant: "success", label: "Enterprise" },
    };
    const c = colors[plan] || { variant: "info" as const, label: plan };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-[var(--foreground)]">Tenant not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--accent)]">
          <Building2 className="h-6 w-6 text-[var(--primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Tenant Settings</h1>
          <p className="text-[var(--muted-foreground)] mt-0.5">Manage your company profile and preferences</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Edit form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Company Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your company name"
                    disabled={!isTenantAdmin}
                    required
                  />
                </div>

                {/* Logo URL */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Logo URL</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        disabled={!isTenantAdmin}
                      />
                    </div>
                    {logoUrl && (
                      <div className="w-10 h-10 rounded-lg border border-[var(--border)] overflow-hidden flex-shrink-0 bg-white p-1">
                        <img
                          src={logoUrl}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Upload your logo to a public URL (e.g. ImgBB, Cloudinary) and paste the link here
                  </p>
                </div>

                {/* Settings section */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <h3 className="font-medium text-sm mb-4">General Settings</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => updateSetting("timezone", e.target.value)}
                        disabled={!isTenantAdmin}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      >
                        <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                        <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                        <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                        <option value="Asia/Singapore">Asia/Singapore</option>
                        <option value="Asia/Shanghai">Asia/Shanghai</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Date Format</label>
                      <select
                        value={settings.date_format}
                        onChange={(e) => updateSetting("date_format", e.target.value)}
                        disabled={!isTenantAdmin}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD MMM YYYY">DD MMM YYYY</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Currency</label>
                      <select
                        value={settings.currency}
                        onChange={(e) => updateSetting("currency", e.target.value)}
                        disabled={!isTenantAdmin}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      >
                        <option value="IDR">IDR (Rp)</option>
                        <option value="USD">USD ($)</option>
                        <option value="SGD">SGD (S$)</option>
                        <option value="MYR">MYR (RM)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Late Threshold (minutes)</label>
                      <Input
                        type="number"
                        value={settings.late_threshold_minutes}
                        onChange={(e) => updateSetting("late_threshold_minutes", parseInt(e.target.value) || 15)}
                        disabled={!isTenantAdmin}
                        min={1}
                        max={120}
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--secondary)] transition-colors">
                      <input
                        type="checkbox"
                        checked={settings.enable_selfie_clockin}
                        onChange={(e) => updateSetting("enable_selfie_clockin", e.target.checked)}
                        disabled={!isTenantAdmin}
                        className="rounded border-[var(--border)]"
                      />
                      <div>
                        <p className="text-sm font-medium">Selfie Clock-In</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Require selfie on clock-in</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--secondary)] transition-colors">
                      <input
                        type="checkbox"
                        checked={settings.enable_location_tracking}
                        onChange={(e) => updateSetting("enable_location_tracking", e.target.checked)}
                        disabled={!isTenantAdmin}
                        className="rounded border-[var(--border)]"
                      />
                      <div>
                        <p className="text-sm font-medium">Location Tracking</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Record GPS on clock-in/out</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--secondary)] transition-colors">
                      <input
                        type="checkbox"
                        checked={settings.enable_overtime}
                        onChange={(e) => updateSetting("enable_overtime", e.target.checked)}
                        disabled={!isTenantAdmin}
                        className="rounded border-[var(--border)]"
                      />
                      <div>
                        <p className="text-sm font-medium">Overtime</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Enable overtime requests</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Raw JSON toggle */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { setUseRawJson(!useRawJson); setRawJson(JSON.stringify(settings, null, 2)); }}
                    className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"
                  >
                    {useRawJson ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {useRawJson ? "Use form fields instead" : "Edit raw JSON settings"}
                  </button>
                  {useRawJson && (
                    <textarea
                      value={rawJson}
                      onChange={(e) => setRawJson(e.target.value)}
                      disabled={!isTenantAdmin}
                      rows={10}
                      className="w-full mt-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  )}
                </div>

                {/* Save button */}
                {isTenantAdmin && (
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar: Info cards */}
        <div className="space-y-6">
          {/* Plan Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Plan & Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">Plan</span>
                {planBadge(tenant.plan)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">Status</span>
                {tenant.is_active ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="danger">Inactive</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">Max Employees</span>
                <span className="font-medium">{tenant.max_employees}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">Price/Employee</span>
                <span className="font-medium">
                  {tenant.plan_price_per_employee > 0 ? `Rp ${tenant.plan_price_per_employee.toLocaleString()}` : "Free"}
                </span>
              </div>
              {tenant.subscription_expires_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">Expires</span>
                  <span className="font-medium text-sm">
                    {new Date(tenant.subscription_expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Name</p>
                <p className="font-medium">{tenant.name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Slug</p>
                <p className="font-mono text-sm">{tenant.slug}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Tenant ID</p>
                <p className="font-mono text-xs text-[var(--muted-foreground)] break-all">
                  {tenant.id}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Created</p>
                <p className="font-medium text-sm">
                  {new Date(tenant.created_at).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {tenant.logo_url && (
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Current Logo</p>
                  <div className="mt-1 w-16 h-16 rounded-lg border border-[var(--border)] overflow-hidden bg-white p-1">
                    <img
                      src={tenant.logo_url}
                      alt="Company logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'><rect width='24' height='24' rx='4'/></svg>";
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
