import { type } from 'arkenv';

// ── Enums ──────────────────────────────────────────────
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

// ── Base schema — common to every app in the monorepo ──
// Spread this into arkenv() alongside your app-specific keys:
//   const env = arkenv({ ...baseEnvSchema, MY_APP_KEY: 'string' });
export const baseEnvSchema = {
  NODE_ENV: type('string').default('development'),
  APP_MODE: type('string').default('sandbox'),
  PORT: type('number.port').default(3000),
  API_PREFIX: type('string').default('api'),
  API_VERSION: type('string').default('1.0.0'),

  CORS_ORIGINS: type('string').default('*'),

  SWAGGER_TITLE: type('string').default('Triply API'),
  SWAGGER_DESCRIPTION: type('string').default('The Triply Travel Platform API'),
  SWAGGER_VERSION: type('string').default('1.0'),

  THROTTLE_TTL: type('number').default(60000),
  THROTTLE_LIMIT: type('number').default(100),
};

// ── NestJS ConfigModule validate adapter ───────────────
export function validate(config: Record<string, unknown>) {
  return config;
}
