import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.enableShutdownHooks();
  app.use(helmet());
  app.use(compression());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const apiPrefix = config.get<string>('API_PREFIX', 'api/v1').replace(/^\/+|\/+$/g, '');
  app.setGlobalPrefix(apiPrefix);

  const corsOrigins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:6200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  if (config.get<boolean>('SWAGGER_ENABLED', true)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SafeFleet AI Backend API')
      .setDescription('Driver and fleet safety management API')
      .setVersion(config.get<string>('APP_VERSION', '0.1.0'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      useGlobalPrefix: false,
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = config.get<number>('PORT', 6100);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
