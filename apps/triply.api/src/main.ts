import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const appConfig = configService.get('app');
  const logger = new Logger('Bootstrap');

  // ── Security ─────────────────────────────────────────
  app.use(helmet());
  app.use(compression());

  // ── CORS ─────────────────────────────────────────────
  app.enableCors({
    origin: appConfig.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: true,
    maxAge: 3600,
  });

  // ── Global Prefix & Versioning ───────────────────────
  app.setGlobalPrefix(appConfig.prefix, {
    exclude: ['health', 'ready'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.version,
    prefix: 'v',
  });

  // ── Global Validation Pipe ───────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: appConfig.isProduction,
    }),
  );

  // ── Swagger (disabled in production live mode) ───────
  if (appConfig.swagger.enabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appConfig.swagger.title)
      .setDescription(appConfig.swagger.description)
      .setVersion(appConfig.swagger.version)
      .addBearerAuth()
      .addTag('health', 'Health check endpoints')
      .addTag('flights', 'Flight search and booking')
      .addServer(
        appConfig.isSandbox
          ? `http://localhost:${appConfig.port}`
          : process.env.API_BASE_URL || `http://localhost:${appConfig.port}`,
        appConfig.isSandbox ? 'Sandbox' : 'Live',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${appConfig.prefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log(`Swagger docs available at /${appConfig.prefix}/docs`);
  }

  // ── Graceful Shutdown ────────────────────────────────
  app.enableShutdownHooks();

  // ── Start Server ─────────────────────────────────────
  await app.listen(appConfig.port);

  logger.log(
    `Application is running on: http://localhost:${appConfig.port}/${appConfig.prefix}`,
  );
  logger.log(`Environment: ${appConfig.env}`);
  logger.log(
    `Mode: ${appConfig.mode} (${appConfig.isLive ? 'LIVE' : 'SANDBOX'})`,
  );
}

bootstrap();
