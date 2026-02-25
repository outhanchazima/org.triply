import arkenv, { type } from 'arkenv';
import { baseEnvSchema } from '@org.triply/shared';

export const env = arkenv({
  ...baseEnvSchema,

  // ── Amadeus API (required) ───────────────────────────
  AMADEUS_API_URL: 'string',
  AMADEUS_API_KEY: 'string',
  AMADEUS_API_SECRET: 'string',
  AMADEUS_APP_NAME: type('string').default('triply'),

  // ── Database ─────────────────────────────────────────
  DATABASE_URL: 'string',
  MONGODB_URI: 'string',
  REDIS_URL: 'string',

  // ── JWT ──────────────────────────────────────────────
  JWT_SECRET: 'string',
  JWT_EXPIRATION: 'number',
});

export type AppEnv = typeof env;
