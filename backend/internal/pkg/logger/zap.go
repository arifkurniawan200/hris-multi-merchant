package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func New(env string) (*zap.Logger, error) {
	if env == "production" {
		cfg := zap.NewProductionConfig()
		cfg.EncoderConfig.TimeKey = "timestamp"
		cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		cfg.InitialFields = map[string]interface{}{
			"service": "hris-api",
		}
		return cfg.Build()
	}

	cfg := zap.NewDevelopmentConfig()
	cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	return cfg.Build()
}

func WithRequestID(log *zap.Logger, requestID string) *zap.Logger {
	return log.With(zap.String("request_id", requestID))
}

// ErrField returns a zap.Field for error logging.
func ErrField(err error) zap.Field {
	return zap.Error(err)
}

// Str returns a zap.Field for string logging.
func Str(key, value string) zap.Field {
	return zap.String(key, value)
}
