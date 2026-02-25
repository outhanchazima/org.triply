import { registerAs } from '@nestjs/config';
import { AppMode, env, Environment } from './env.validation';

export const appConfig = registerAs('app', () => {
  const nodeEnv = env.NODE_ENV;
  const mode = env.APP_MODE;

  return {
    env: nodeEnv,
    mode,
    port: env.PORT,
    prefix: env.API_PREFIX,
    version: env.API_VERSION,

    isProduction: nodeEnv === Environment.Production,
    isDevelopment: nodeEnv === Environment.Development,
    isSandbox: mode === AppMode.Sandbox,
    isLive: mode === AppMode.Live,

    cors: {
      origins: parseCorsOrigins(env.CORS_ORIGINS),
    },

    swagger: {
      title: env.SWAGGER_TITLE,
      description: env.SWAGGER_DESCRIPTION,
      version: env.SWAGGER_VERSION,
      enabled: nodeEnv !== Environment.Production || mode === AppMode.Sandbox,
    },

    throttle: {
      ttl: env.THROTTLE_TTL,
      limit: env.THROTTLE_LIMIT,
    },
  };
});

function parseCorsOrigins(origins: string): string[] | string {
  if (origins === '*') return '*';
  return origins.split(',').map((o) => o.trim());
}
