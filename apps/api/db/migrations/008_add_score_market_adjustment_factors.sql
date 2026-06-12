-- CreditIQ Lite
-- Migration 008: add effective-dated market adjustment factors for score recalibration

CREATE TABLE IF NOT EXISTS score_market_adjustment_factors (
  id UUID PRIMARY KEY,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ NULL,
  inflation_percent NUMERIC(6,2) NOT NULL,
  devaluation_percent NUMERIC(6,2) NOT NULL,
  factor NUMERIC(8,4) NOT NULL,
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT score_market_adjustment_factor_range CHECK (factor > 0 AND factor <= 2),
  CONSTRAINT score_market_adjustment_date_check CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_score_market_adjustment_effective_from
  ON score_market_adjustment_factors (effective_from DESC);

INSERT INTO score_market_adjustment_factors (
  id,
  effective_from,
  effective_to,
  inflation_percent,
  devaluation_percent,
  factor,
  rationale
)
VALUES
  (
    '4f9a40c9-9b72-4af2-a00d-5f8389fd8f2a',
    '2025-01-01T00:00:00Z',
    '2025-12-31T23:59:59Z',
    14.00,
    4.00,
    0.9500,
    'Baseline macroeconomic adjustment for 2025 cycle.'
  ),
  (
    '00ea53df-d2ee-40f5-962b-b90a784ea095',
    '2026-01-01T00:00:00Z',
    NULL,
    18.00,
    8.00,
    0.9200,
    'Current effective recalibration factor reflecting inflation and devaluation.'
  )
ON CONFLICT (id) DO NOTHING;
