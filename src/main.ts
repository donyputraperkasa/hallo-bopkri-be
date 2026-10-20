import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 4000;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigins = [
    'http://localhost:3000',
    ...(process.env.CORS_ORIGIN?.split(',') ?? []),
  ]
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  app.enableCors({
    credentials: true,
    origin: [...new Set(allowedOrigins)],
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          // Safari menaikkan http://localhost menjadi https://localhost jika
          // directive ini aktif, sehingga aset Swagger gagal dimuat saat dev.
          'upgrade-insecure-requests': isDevelopment ? null : [],
        },
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Bukti aduan tidak dijadikan folder static. File hanya dapat diakses
  // melalui endpoint lampiran admin yang menggunakan AdminAuthGuard.

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hallo BOPKRI API')
    .setDescription('Dokumentasi API layanan aduan Hallo BOPKRI')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const isSwaggerEnabled =
    isDevelopment || process.env.ENABLE_SWAGGER === 'true';

  if (isSwaggerEnabled) {
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

  await app.listen(port, '0.0.0.0');

  console.clear();
  console.log(
    '\x1b[36m%s\x1b[0m',
    '================================================',
  );
  console.log('\x1b[32m%s\x1b[0m', ' Hallo BOPKRI Backend is Running');
  console.log(
    '\x1b[36m%s\x1b[0m',
    '================================================',
  );
  console.log(` Server URL   : http://localhost:${port}/api`);
  if (isSwaggerEnabled) {
    console.log(` Swagger API  : http://localhost:${port}/api/docs`);
  }
  console.log(` Environment  : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(' Developed by : dony putra perkasa (owner)');
  console.log(
    '\x1b[36m%s\x1b[0m',
    '================================================',
  );
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

process.on('uncaughtException', (error: unknown) => {
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (error: unknown) => {
  console.error(error);
  process.exit(1);
});
