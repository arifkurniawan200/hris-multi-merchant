package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all application configuration.
type Config struct {
	Database DatabaseConfig `yaml:"database"`
	JWT      JWTConfig      `yaml:"jwt"`
	Server   ServerConfig   `yaml:"server"`
	Plans    PlansConfig    `yaml:"plans"`
}

type DatabaseConfig struct {
	DSN         string `yaml:"dsn"`
	MaxOpen     int    `yaml:"max_open"`
	MaxIdle     int    `yaml:"max_idle"`
	MaxLifetime string `yaml:"max_lifetime"`
}

type JWTConfig struct {
	AccessSecret  string `yaml:"access_secret"`
	RefreshSecret string `yaml:"refresh_secret"`
	AccessExpiry  string `yaml:"access_expiry"`
	RefreshExpiry string `yaml:"refresh_expiry"`
}

type ServerConfig struct {
	Port            int    `yaml:"port"`
	ReadTimeout     string `yaml:"read_timeout"`
	WriteTimeout    string `yaml:"write_timeout"`
	ShutdownTimeout string `yaml:"shutdown_timeout"`
}

type PlanConfig struct {
	MaxEmployees int `yaml:"max_employees"`
}

type PlansConfig struct {
	Free       PlanConfig `yaml:"free"`
	Pro        PlanConfig `yaml:"pro"`
	Enterprise PlanConfig `yaml:"enterprise"`
}

// MaxEmployeesForPlan returns the max employees for a given plan name.
func (p PlansConfig) MaxEmployeesForPlan(plan string) int {
	switch plan {
	case "pro":
		return p.Pro.MaxEmployees
	case "enterprise":
		return p.Enterprise.MaxEmployees
	default:
		return p.Free.MaxEmployees
	}
}

// ── Defaults with env overrides ──────────────────

func Load() *Config {
	// Start with defaults, then env can override critical fields.
	cfg := &Config{
		Database: DatabaseConfig{
			DSN:         getEnv("DB_DSN", ""),
			MaxOpen:     25,
			MaxIdle:     5,
			MaxLifetime: "5m",
		},
		JWT: JWTConfig{
			AccessSecret:  getEnv("JWT_ACCESS_SECRET", "change-me-access-secret"),
			RefreshSecret: getEnv("JWT_REFRESH_SECRET", "change-me-refresh-secret"),
			AccessExpiry:  "15m",
			RefreshExpiry: "168h",
		},
		Server: ServerConfig{
			Port:            getEnvInt("APP_PORT", 3000),
			ReadTimeout:     "10s",
			WriteTimeout:    "15s",
			ShutdownTimeout: "30s",
		},
		Plans: PlansConfig{
			Free:       PlanConfig{MaxEmployees: 5},
			Pro:        PlanConfig{MaxEmployees: 50},
			Enterprise: PlanConfig{MaxEmployees: 10000},
		},
	}

	return cfg
}

func (c *Config) ParseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return 30 * time.Second
	}
	return d
}

// ── helpers ──────────────────────────────────────

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return strings.TrimSpace(v)
	}
	return def
}

func getEnvInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil {
		return def
	}
	return n
}
