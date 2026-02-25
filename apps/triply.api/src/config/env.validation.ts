import arkenv, { type } from 'arkenv';

export const env = arkenv({
  // ── Application ──────────────────────────────────────
  NODE_ENV: "'development' | 'sandbox' | 'production' | 'test' = 'development'",
  APP_MODE: "'sandbox' | 'live' = 'sandbox'",
  PORT: type('number.port').default(3000),
  API_PREFIX: type('string').default('api'),
  API_VERSION: type('string').default('v1'),

  // ── CORS ─────────────────────────────────────────────
  CORS_ORIGINS: type('string').default('*'),

  // ── Swagger ──────────────────────────────────────────
  SWAGGER_TITLE: type('string').default('Triply API'),
  SWAGGER_DESCRIPTION: type('string').default('The Triply Travel Platform API'),
  SWAGGER_VERSION: type('string').default('1.0'),

  // ── Rate Limiting ────────────────────────────────────
  THROTTLE_TTL: type('number').default(60000),
  THROTTLE_LIMIT: type('number').default(100),

  // ── Amadeus API (required) ───────────────────────────
  AMADEUS_API_URL: 'string',
  AMADEUS_API_KEY: 'string',
  AMADEUS_API_SECRET: 'string',
  AMADEUS_APP_NAME: type('string').default('triply'),

  // ── Database (optional) ──────────────────────────────
  DATABASE_URL: 'string',
  MONGODB_URI: 'string',
  REDIS_URL: 'string',

  // ── JWT (optional) ───────────────────────────────────
  JWT_SECRET: 'string',
  JWT_EXPIRATION: 'number',
});

export type Env = typeof env;

// ── Convenience enums for use in app.config.ts ─────────
export const Environment = {
  Development: 'development',
  Sandbox: 'sandbox',
  Production: 'production',
  Test: 'test',
} as const;

export const AppMode = {
  Sandbox: 'sandbox',
  Live: 'live',
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];
export type AppMode = (typeof AppMode)[keyof typeof AppMode];

// ── NestJS ConfigModule validate adapter ───────────────
export function validate(config: Record<string, unknown>) {
  // arkenv already validated process.env on import — just pass through
  return config;
}
