## Summary

Adds full shift management system integrated with the attendance module.

### What's new
- **Shift templates**: admin (manager+) creates shift types per tenant — customizable name, code, start/end time, grace period, clock-in/out windows, flexible mode, color
- **Config-driven defaults**: cutoff time, grace minutes, clock-in/out windows all from `config.yaml` — zero hardcode
- **Employee shift assignment**: assign shifts to employees with effective date ranges (supports rotation)
- **Clock-in/out window gating**: employee can only clock-in within `(shift_start - clockin_window_before)` and clock-out within `(shift_end + clockout_window_after)`. Admin configures per shift, defaults to 60 min.
- **Status detection**: uses shift start time + grace period instead of hardcoded 08:00
- **Flexible shift**: `is_flexible=true` skips all window validations — employee can clock-in anytime
- **Bulk assignment**: assign shift to multiple employees at once
- **Employee self-service**: `GET /api/v1/employee/me/shift` returns today's active shift

### Endpoints
| Endpoint | Method | Role | Description |
|---|---|---|---|
| /api/v1/shifts | POST/GET | manager+ | Create/list shift templates |
| /api/v1/shifts/bulk-assign | POST | manager+ | Bulk assign shift to employees |
| /api/v1/shifts/{id} | GET/PUT/DELETE | manager+ | CRUD single shift |
| /api/v1/shifts/{id}/employees | GET | manager+ | List employees in a shift |
| /api/v1/employees/{id}/shifts | POST/GET | manager+ | Assign/list employee shift history |
| /api/v1/employees/{id}/shifts/{sid} | PUT/DELETE | manager+ | Update/remove assignment |
| /api/v1/employee/me/shift | GET | employee+ | My shift today |

### Files changed (13 files, +1284 -15)
- **2 migrations**: `013_shifts.up.sql`, `014_employee_shifts.up.sql`
- **Domain**: `Shift`, `EmployeeShift` entities + DTOs + interfaces
- **Repository**: `shift_repo.go`, `employee_shift_repo.go` (DBTX + dbQuerier pattern)
- **Usecase**: `shift_usecase.go`, `employee_shift_usecase.go` (CRUD + assignment logic)
- **Handler**: `shift_handler.go` (admin + employee self-service)
- **Config**: `AttendanceConfig` struct + defaults in `config.yaml`
- **Attendance integration**: `ClockIn`/`ClockOut` now resolve active shift, validate windows, detect status from shift
- **main.go**: wiring + routes
