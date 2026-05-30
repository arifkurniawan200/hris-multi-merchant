CREATE TABLE tenants (
    id            UUID PRIMARY KEY,
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    plan          TEXT NOT NULL CHECK (plan IN ('free','pro','enterprise')),
    max_employees INT NOT NULL DEFAULT 10,
    settings      JSONB NOT NULL DEFAULT '{}'::jsonb,
    logo_url      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
