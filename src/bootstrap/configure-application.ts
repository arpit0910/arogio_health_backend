import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter';
import { validationExceptionFactory } from '../common/validation/validation-exception.factory';
import { RequestActivityService } from '../modules/status/request-activity.service';

export function configureApplication(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.use(helmet());
  app.use(app.get(RequestActivityService).middleware);
  app.useStaticAssets(join(__dirname, '..', 'modules', 'status', 'public'), {
    prefix: '/status-assets/',
    index: false,
    maxAge: 0,
  });
  // Serve the public status document without changing Nest's API prefix or
  // middleware route matching (including request-correlated Pino logging).
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'GET' || request.path !== '/') {
      next();
      return;
    }
    response.setHeader('Cache-Control', 'no-store');
    response.sendFile(join(__dirname, '..', 'modules', 'status', 'public', 'index.html'));
  });
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: false, limit: '1mb' }));
  app.enableCors({
    origin: config.getOrThrow<string[]>('CORS_ORIGINS'),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  if (config.getOrThrow<boolean>('SWAGGER_ENABLED')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Arogio Health API')
      .setDescription('Arogio Health backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }
}
