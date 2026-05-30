package logger

import (
	"context"
	"os"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/pkg/contextkeys"
	"github.com/sirupsen/logrus"
)

// L is the global logger instance.
var L = logrus.New()

// Init configures the global logger. Call once from main().
func Init(env string) {
	L.SetOutput(os.Stdout)
	L.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime:  "timestamp",
			logrus.FieldKeyLevel: "level",
			logrus.FieldKeyMsg:   "message",
		},
	})

	if env == "production" {
		L.SetLevel(logrus.InfoLevel)
	} else {
		L.SetLevel(logrus.DebugLevel)
	}

	L.AddHook(&contextHook{})
}

// contextHook automatically enriches log entries with contextual fields
// (request_id, tenant_id, user_id) extracted from the shared contextkeys package.
// This ensures middleware and logger use the SAME typed keys — no mismatch.
type contextHook struct{}

func (h *contextHook) Levels() []logrus.Level { return logrus.AllLevels }

func (h *contextHook) Fire(entry *logrus.Entry) error {
	if entry.Context == nil {
		return nil
	}
	if v, ok := entry.Context.Value(contextkeys.RequestID).(string); ok && v != "" {
		entry.Data["request_id"] = v
	}
	if v, ok := entry.Context.Value(contextkeys.TenantID).(string); ok && v != "" {
		entry.Data["tenant_id"] = v
	}
	if v, ok := entry.Context.Value(contextkeys.UserID).(string); ok && v != "" {
		entry.Data["user_id"] = v
	}
	return nil
}

// Convenience methods that accept context.
func Info(ctx context.Context, msg string, fields ...interface{}) {
	L.WithContext(ctx).WithFields(toFields(fields...)).Info(msg)
}

func Error(ctx context.Context, msg string, fields ...interface{}) {
	L.WithContext(ctx).WithFields(toFields(fields...)).Error(msg)
}

func Debug(ctx context.Context, msg string, fields ...interface{}) {
	L.WithContext(ctx).WithFields(toFields(fields...)).Debug(msg)
}

func Warn(ctx context.Context, msg string, fields ...interface{}) {
	L.WithContext(ctx).WithFields(toFields(fields...)).Warn(msg)
}

// Fatal logs and exits. No context needed — app is dying.
func Fatal(msg string, fields ...interface{}) {
	L.WithFields(toFields(fields...)).Fatal(msg)
}

// WithField variants for convenience.
type F map[string]interface{}

func Infof(ctx context.Context, fields F, msg string) {
	entry := L.WithContext(ctx)
	for k, v := range fields {
		entry = entry.WithField(k, v)
	}
	entry.Info(msg)
}

func Errorf(ctx context.Context, fields F, msg string) {
	entry := L.WithContext(ctx)
	for k, v := range fields {
		entry = entry.WithField(k, v)
	}
	entry.Error(msg)
}

func toFields(kv ...interface{}) logrus.Fields {
	f := logrus.Fields{}
	for i := 0; i+1 < len(kv); i += 2 {
		key, ok := kv[i].(string)
		if !ok {
			continue
		}
		f[key] = kv[i+1]
	}
	return f
}
