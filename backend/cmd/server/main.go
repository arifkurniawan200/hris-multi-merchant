package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/handler"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/middleware"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/logger"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/repository"
	"github.com/arifkurniawan200/hris-multi-merchant/internal/usecase"

	"github.com/go-chi/chi/v5"
	chicors "github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	log, err := logger.New(getEnv("APP_ENV", "development"))
	if err != nil {
		panic("init logger: " + err.Error())
	}

	// ── DB ──────────────────────────────────
	dbpool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal("connect db", logger.ErrField(err))
	}
	defer dbpool.Close()

	// ── JWT ─────────────────────────────────
	jwtMgr := middleware.NewJWTManager(
		os.Getenv("JWT_ACCESS_SECRET"),
		os.Getenv("JWT_REFRESH_SECRET"),
		15*time.Minute,
		7*24*time.Hour,
	)

	// ── Repos ───────────────────────────────
	tenantRepo := repository.NewTenantRepo(dbpool)
	userRepo := repository.NewUserRepo(dbpool)

	// ── Usecases (manual DI) ────────────────
	tenantUC := usecase.NewTenantUC(tenantRepo)
	userUC := usecase.NewUserUC(userRepo, jwtMgr)

	// ── Handlers ────────────────────────────
	authH := handler.NewAuthHandler(userUC, jwtMgr, nil)
	tenantH := handler.NewTenantHandler(tenantUC)

	// ── Middleware ──────────────────────────
	authMw := middleware.NewAuth(jwtMgr)
	setCfg := func(ctx context.Context, key string, value string) error {
		_, err := dbpool.Exec(ctx, "SELECT set_config($1, $2, true)", key, value)
		return err
	}
	tenantMw := middleware.TenantCtx(setCfg)
	rbAdmin := middleware.RequireRole("super_admin")
	rbTenantAdmin := middleware.RequireRole("tenant_admin")

	// ── Router ──────────────────────────────
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logger(log))
	r.Use(middleware.Recovery(log))
	r.Use(chicors.Handler(chicors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// ── Public ──────────────────────────────
	r.Get("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"success":true,"data":{"status":"ok"}}`))
	})

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
		})

		// Super admin only
		r.Group(func(r chi.Router) {
			r.Use(rbAdmin)
			r.Get("/api/v1/admin/tenants", tenantH.ListAllTenants)
			r.Post("/api/v1/admin/tenants", tenantH.CreateByAdmin)
		})
	})

	// ── Server ──────────────────────────────
	port := getEnv("APP_PORT", "8080")
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Info("server_starting", logger.Str("port", port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server_failed", logger.ErrField(err))
		}
	}()

	// ── Graceful shutdown ───────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("server_shutting_down")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error("shutdown_error", logger.ErrField(err))
	}
	log.Info("server_stopped")
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
