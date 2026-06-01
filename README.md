# HRIS Multi-Merchant

Platform HRIS SaaS multi-tenant untuk pasar Indonesia. Satu codebase, banyak perusahaan, data terisolasi per tenant.

## Fitur

### Phase 1 — Foundation ✅
- **Auth & Tenant** — register/login, JWT, multi-role (super_admin / tenant_admin / manager / employee)
- **Tenant Management** — create tenant, subscription lifecycle (activate/deactivate/extend/change plan)
- **Employee Management** — CRUD karyawan lengkap, struktur departemen hierarkis, posisi/jabatan, org chart

### Phase 2 — Attendance (coming soon)
- Clock-in/out dengan GPS
- Multi-shift, overtime
- Attendance summary & report

### Phase 3 — Leave & Payroll (coming soon)
- Kebijakan cuti per tenant
- Kalkulasi payroll PPh21 + BPJS
- Multi-bank disbursement

## Tech Stack

```
Backend:   Go 1.22 + chi router + pgx (raw SQL)
Database:  PostgreSQL 15+ (external — SumoBase)
Config:    YAML-driven, zero hardcode
Auth:      JWT (access + refresh), bcrypt cost 12
Validation: go-playground/validator/v10
Logging:   Zap structured logger dengan request ID tracing
Monitoring: Prometheus + Grafana
Gateway:   Traefik
Frontend:  Next.js (coming soon)

Architecture: Clean Architecture + SOLID
  domain → usecase → handler → repository → adapter
```

## Project Structure

```
backend/
├── cmd/server/main.go        # Entry point + DI wiring
├── configs/config.yaml        # All configuration (DSN, JWT, plans, timeouts)
├── internal/
│   ├── adapter/db.go          # PostgreSQL connection pool
│   ├── config/config.go       # Config struct + loader
│   ├── domain/
│   │   ├── models.go          # Domain entities + repository/useCase interfaces
│   │   ├── requests.go        # Request DTOs with validator tags
│   │   └── errors.go          # Structured AppError (3xxx error codes)
│   ├── repository/            # Raw SQL pgx implementations
│   │   ├── tenant_repo.go
│   │   ├── user_repo.go
│   │   ├── user_tenant_repo.go
│   │   ├── department_repo.go
│   │   ├── position_repo.go
│   │   └── employee_repo.go
│   ├── usecase/               # Business logic + validation
│   │   ├── tenant_usecase.go
│   │   ├── user_usecase.go
│   │   ├── department_usecase.go
│   │   ├── position_usecase.go
│   │   ├── employee_usecase.go
│   │   └── validator.go
│   ├── handler/               # HTTP handlers
│   │   ├── auth_handler.go
│   │   ├── admin_handler.go
│   │   ├── tenant_handler.go
│   │   ├── employee_handler.go  # Also contains Department + Position handlers
│   │   └── helpers.go           # handleDomainErr mapper
│   ├── middleware/             # Request ID, Auth, Tenant context, RBAC
│   └── pkg/
│       ├── logger/zap.go      # Zap logger with request_id injection
│       └── response/json.go   # Standard envelope {success, message, error_code, data}
├── migrations/                # SQL migrations (001–012)
└── Dockerfile
```

## API Response Standard

Semua response pakai envelope yang sama:

**Success:**
```json
{
    "success": true,
    "message": "Employee created",
    "error_code": 0,
    "request_id": "req_abc123",
    "data": { ... }
}
```

**Error:**
```json
{
    "success": false,
    "message": "Invalid email or password",
    "error_code": 3201,
    "request_id": "req_abc123",
    "data": {}
}
```

### Error Codes

| Range | Category |
|-------|----------|
| 3000–3099 | Validation / input |
| 3100–3199 | Resource (not found, conflict) |
| 3200–3299 | Auth (unauthorized, forbidden) |
| 3300–3399 | Tenant / context |
| 3999 | Internal server error |

## Getting Started

### Prerequisites
- Go 1.22+
- PostgreSQL 15+ (via `DB_DSN` env var)
- Docker (optional, for full stack with Traefik)

### Run Locally

```bash
export DB_DSN="postgres://user:pass@host:5432/hris?sslmode=require"
export JWT_ACCESS_SECRET="your-secret"
export JWT_REFRESH_SECRET="your-refresh-secret"

cd backend
go run cmd/server/main.go
```

Server starts on `:3000`.

### Run with Docker Compose

```bash
docker compose up -d
```

Services: Traefik (reverse proxy) → API (:3000) + Prometheus + Grafana.

### Run Migrations

```bash
# Manual: apply .sql files in order (001 → 012)
psql "$DB_DSN" -f migrations/001_create_tenants.sql
psql "$DB_DSN" -f migrations/002_create_users.sql
# ... up to 012
```

## API Endpoints

### Auth (Public)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login → JWT |
| POST | `/api/v1/auth/refresh` | Refresh token |
| GET | `/api/v1/auth/me` | Current user profile |

### Tenant (Tenant Admin+)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tenants/me` | My tenant details |
| PUT | `/api/v1/tenants/me` | Update my tenant |

### Departments (Manager+)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/departments` | Create department |
| GET | `/api/v1/departments?parent_id=` | List (optional parent filter) |
| GET | `/api/v1/departments/{id}` | Get department |
| PUT | `/api/v1/departments/{id}` | Update department |
| DELETE | `/api/v1/departments/{id}` | Soft delete |

### Positions (Manager+)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/positions` | Create position |
| GET | `/api/v1/positions` | List all positions |
| GET | `/api/v1/positions/{id}` | Get position |
| PUT | `/api/v1/positions/{id}` | Update position |
| DELETE | `/api/v1/positions/{id}` | Soft delete |

### Employees (Manager+ write, Employee+ read)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/employees` | Create employee |
| GET | `/api/v1/employees?status=&department_id=&position_id=&search=&limit=&offset=` | List with filters |
| GET | `/api/v1/employees/{id}` | Get employee detail |
| PUT | `/api/v1/employees/{id}` | Update employee |
| DELETE | `/api/v1/employees/{id}` | Soft delete |
| PUT | `/api/v1/employees/{id}/status` | Change employment status |
| GET | `/api/v1/org-chart` | Organization tree |

### Admin (Super Admin only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/tenants` | List all tenants |
| POST | `/api/v1/admin/tenants` | Create tenant |
| PUT | `/api/v1/admin/tenants/{id}/activate` | Activate tenant |
| PUT | `/api/v1/admin/tenants/{id}/deactivate` | Deactivate tenant |
| PUT | `/api/v1/admin/tenants/{id}/extend` | Extend subscription |
| PUT | `/api/v1/admin/tenants/{id}/plan` | Change plan |
| DELETE | `/api/v1/admin/tenants/{id}` | Soft delete tenant |

## Logging & Tracing

Setiap request punya `request_id` yang tercatat di:
- **Response envelope** — `response.request_id` di setiap JSON response
- **Structured logs** — Zap dengan field `request_id`, `user_id`, `tenant_id`
- **Middleware** — `Logger` middleware mencatat method, path, status, duration
- **Usecase** — `Info()` untuk success, `Error()` untuk failure, semua dengan konteks operasi

Log level: `INFO` (development default) atau production JSON format via `APP_ENV=production`.

Semua log di-inject ke Grafana via Prometheus metrics endpoint (`/metrics`) dan Traefik access logs.
