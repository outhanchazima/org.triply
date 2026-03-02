import arkenv, { type } from 'arkenv';
import { baseEnvSchema } from '@org.triply/shared';

export const env = arkenv({
  ...baseEnvSchema,

  // ── Database ─────────────────────────────────────────
  DATABASE_URL: type('string'),
  MONGODB_URI: type('string'),
  REDIS_URL: type('string'),

  // ── File Upload / Storage ──────────────────────────
  STORAGE_PROVIDER: type('string').default('local'),
  FILE_UPLOAD_MAX_SIZE: type('number').default(20971520),
  FILE_UPLOAD_DEFAULT_FOLDER: type('string').default('general'),
  FILE_UPLOAD_ALLOWED_MIME_TYPES: type('string').default(''),
  FILE_UPLOAD_EXTRA_MIME_TYPES: type('string').default(''),
  LOCAL_UPLOAD_ROOT: type('string').default('./uploads'),
  LOCAL_UPLOAD_BASE_URL: type('string').default('/uploads'),
  S3_ENDPOINT: type('string').default(''),
  S3_BUCKET: type('string').default(''),
  S3_REGION: type('string').default('us-east-1'),
  S3_ACCESS_KEY: type('string').default(''),
  S3_SECRET_KEY: type('string').default(''),
  S3_FORCE_PATH_STYLE: type('boolean').default(false),
  S3_PUBLIC_URL: type('string').default(''),

  // ── JWT Authentication ─────────────────────────────────
  JWT_SECRET: type('string'),
  JWT_REFRESH_SECRET: type('string'),
  JWT_EXPIRES_IN: type('string'),
  JWT_REFRESH_EXPIRES_IN: type('string'),

  // ── OTP ────────────────────────────────────────────────
  OTP_SECRET: type('string'),
  OTP_PERIOD: type('number'),

  // ── Google OAuth ───────────────────────────────────────
  GOOGLE_CLIENT_ID: type('string'),
  GOOGLE_CLIENT_SECRET: type('string'),
  GOOGLE_CALLBACK_URL: type('string'),

  // ── Email Configuration ─────────────────────────────────
  MAIL_HOST: type('string'),
  MAIL_PORT: type('number'),
  MAIL_SECURE: type('boolean'),
  MAIL_USER: type('string'),
  MAIL_PASS: type('string'),
  MAIL_FROM: type('string'),
  MAIL_FROM_NAME: type('string'),
  APP_URL: type('string').default('http://localhost:4200'),

  // ── Encryption ───────────────────────────────────────────
  ENCRYPTION_KEY: type('string'),

  // ── Security Configuration ─────────────────────────────
  OTP_EXPIRY_MINUTES: type('number'),
  MAX_LOGIN_ATTEMPTS: type('number'),
  ACCOUNT_LOCKOUT_MINUTES: type('number'),

  // ── Logging Configuration ────────────────────────────────
  LOG_LEVEL: type('string'),
  LOG_ENABLE_FILE: type('boolean'),
  LOG_DIR: type('string'),
  LOG_MAX_FILE_SIZE: type('number'),
  LOG_MAX_FILES: type('number'),
  LOG_ENABLE_CONSOLE: type('boolean'),
  LOG_ENABLE_JSON: type('boolean'),
  LOG_ENABLE_CORRELATION_ID: type('boolean'),
  LOG_ENABLE_ASYNC: type('boolean'),
  LOG_BUFFER_SIZE: type('number'),
  LOG_FLUSH_INTERVAL: type('number'),

  // ── Amadeus API (required) ───────────────────────────
  AMADEUS_API_URL: type('string'),
  AMADEUS_API_KEY: type('string'),
  AMADEUS_API_SECRET: type('string'),
  AMADEUS_APP_NAME: type('string').default('triply'),

  // ── Development/Testing ───────────────────────────────────
  DEV_DISABLE_EMAIL: type('boolean'),
  DEV_OTP_BYPASS: type('boolean'),
});

export type AppEnv = typeof env;
