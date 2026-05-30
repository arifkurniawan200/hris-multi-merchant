package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/adapter"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/config"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/handler"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/repository"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/usecase"

	"github.com/go-chi/chi/v5"
	chicors "github.com/go-chi/cors"
)

func main() {
	logger.Init(newGetEnv("APP_ENV", "development"))

	cfg := config.Load()

	// ── DB ──────────────────────────────────
	dbpool, err := adapter.NewPgxPool()
	if err != nil {
		logger.Fatal("connect db", "error", err)
	}
	defer dbpool.Close()

	logger.L.WithField("event", "db_connected").Info("database connected")

	// ── JWT ─────────────────────────────────
	jwtMgr := middleware.NewJWTManager(
		cfg.JWT.AccessSecret,
		cfg.JWT.RefreshSecret,
		cfg.ParseDuration(cfg.JWT.AccessExpiry),
		cfg.ParseDuration(cfg.JWT.RefreshExpiry),
	)

	// ── Tx Manager ──────────────────────────
	txMgr := adapter.NewTxManager(dbpool)

	// ── Repos ───────────────────────────────
	tenantRepo := repository.NewTenantRepo(dbpool)
	userRepo := repository.NewUserRepo(dbpool)
	userTenantRepo := repository.NewUserTenantRepo(dbpool)
	deptRepo := repository.NewDepartmentRepo(dbpool)
	posRepo := repository.NewPositionRepo(dbpool)
	empRepo := repository.NewEmployeeRepo(dbpool)

	// ── Usecases ────────────────────────────
	tenantUC := usecase.NewTenantUC(tenantRepo, &cfg.Plans)
	userUC := usecase.NewUserUC(userRepo, userTenantRepo, jwtMgr, txMgr)
	deptUC := usecase.NewDepartmentUC(deptRepo)
	posUC := usecase.NewPositionUC(posRepo)
	empUC := usecase.NewEmployeeUC(empRepo, deptRepo, posRepo)

	// ── Refresh token store (Redis) ─────────
	// TODO: replace with Redis implementation
	refreshStore := &inMemoryRefreshStore{
		tokens: make(map[string]string),
	}

	// ── Handlers ────────────────────────────
	authH := handler.NewAuthHandler(userUC, jwtMgr, refreshStore)
	tenantH := handler.NewTenantHandler(tenantUC)
	adminH := handler.NewAdminHandler(tenantUC)
	deptH := handler.NewDepartmentHandler(deptUC)
	posH := handler.NewPositionHandler(posUC)
	empH := handler.NewEmployeeHandler(empUC, deptUC, posUC)

	// ── Middleware ──────────────────────────
	authMw := middleware.NewAuth(jwtMgr)
	setCfg := func(ctx context.Context, key string, value string) error {
		_, err := dbpool.Exec(ctx, "SELECT set_config($1, $2, true)", key, value)
		return err
	}
	tenantMw := middleware.TenantCtx(setCfg)
	rbAdmin := middleware.RequireRole("super_admin")
	rbTenantAdmin := middleware.RequireRole("tenant_admin")
	rbManager := middleware.RequireRole("manager")
	rbEmployee := middleware.RequireRole("employee")

	// ── Router ──────────────────────────────
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logging)
	r.Use(middleware.Recovery)
	r.Use(chicors.Handler(chicors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// ── Health ──────────────────────────────
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"success":true,"data":{"status":"ok"}}`))
	})

	// ── Public ──────────────────────────────
	r.Post("/api/v1/auth/register", authH.Register)
	r.Post("/api/v1/auth/login", authH.Login)
	r.Post("/api/v1/auth/refresh", authH.Refresh)

	// ── Auth-protected ──────────────────────
	r.Group(func(r chi.Router) {
		r.Use(authMw.Require)

		// Current user
		r.Get("/api/v1/auth/me", authH.Me)

		// Tenant-scoped routes
		r.Group(func(r chi.Router) {
			r.Use(tenantMw)

			// Tenant admin+
			r.Group(func(r chi.Router) {
				r.Use(rbTenantAdmin)
				r.Get("/api/v1/tenants/me", tenantH.MyTenant)
				r.Put("/api/v1/tenants/me", tenantH.UpdateMyTenant)
			})

			// Manager+ — Department CRUD
			r.Group(func(r chi.Router) {
				r.Use(rbManager)
				r.Post("/api/v1/departments", deptH.Create)
				r.Get("/api/v1/departments", deptH.List)
				r.Get("/api/v1/departments/{id}", deptH.Get)
				r.Put("/api/v1/departments/{id}", deptH.Update)
				r.Delete("/api/v1/departments/{id}", deptH.Delete)

				// Position CRUD
				r.Post("/api/v1/positions", posH.Create)
				r.Get("/api/v1/positions", posH.List)
				r.Get("/api/v1/positions/{id}", posH.Get)
				r.Put("/api/v1/positions/{id}", posH.Update)
				r.Delete("/api/v1/positions/{id}", posH.Delete)

				// Employee write
				r.Post("/api/v1/employees", empH.Create)
				r.Put("/api/v1/employees/{id}", empH.Update)
				r.Delete("/api/v1/employees/{id}", empH.Delete)
				r.Put("/api/v1/employees/{id}/status", empH.ChangeStatus)
			})

			// Employee+ — Employee read + org chart
			r.Group(func(r chi.Router) {
				r.Use(rbEmployee)
				r.Get("/api/v1/employees", empH.List)
				r.Get("/api/v1/employees/{id}", empH.Get)
				r.Get("/api/v1/org-chart", empH.OrgChart)
			})
		})

		// Super admin only
		r.Group(func(r chi.Router) {
			r.Use(rbAdmin)
			r.Get("/api/v1/admin/tenants", adminH.ListTenants)
			r.Post("/api/v1/admin/tenants", tenantH.CreateByAdmin)
			r.Put("/api/v1/admin/tenants/{id}/activate", adminH.ActivateTenant)
			r.Put("/api/v1/admin/tenants/{id}/deactivate", adminH.DeactivateTenant)
			r.Put("/api/v1/admin/tenants/{id}/extend", adminH.ExtendTenant)
			r.Put("/api/v1/admin/tenants/{id}/plan", adminH.ChangePlan)
			r.Delete("/api/v1/admin/tenants/{id}", adminH.SoftDeleteTenant)
		})
	})

	// ── Server ──────────────────────────────
	port := strconv.Itoa(cfg.Server.Port)
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  cfg.ParseDuration(cfg.Server.ReadTimeout),
		WriteTimeout: cfg.ParseDuration(cfg.Server.WriteTimeout),
	}

	go func() {
		logger.L.WithField("port", port).Info("server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server failed", "error", err)
		}
	}()

	// ── Graceful shutdown ───────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.L.Info("server shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ParseDuration(cfg.Server.ShutdownTimeout))
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.L.WithField("error", err).Error("shutdown error")
	}
	logger.L.Info("server stopped")
}

func newGetEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// ── In-memory refresh token store (temporary) ──

type inMemoryRefreshStore struct {
	tokens map[string]string
}

func (s *inMemoryRefreshStore) Save(userID, token string, ttlSeconds int) error {
	s.tokens[userID] = token
	return nil
}

func (s *inMemoryRefreshStore) Get(userID string) (string, error) {
	t, ok := s.tokens[userID]
	if !ok {
		return "", os.ErrNotExist
	}
	return t, nil
}

func (s *inMemoryRefreshStore) Delete(userID string) error {
	delete(s.tokens, userID)
	return nil
}
