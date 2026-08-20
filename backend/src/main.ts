import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger as PinoLogger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { json, urlencoded } from "express";
import * as cookieParser from "cookie-parser";
async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Express trust proxy: required for correct req.ip behind reverse proxies
  (app.getHttpAdapter().getInstance() as any).set("trust proxy", 1);

  // Use nestjs-pino logger
  //app.useLogger(app.get(PinoLogger));

  const pinoLogger = app.get(PinoLogger, { strict: false });
  if (pinoLogger) {
    app.useLogger(pinoLogger);
  }

  // Graceful shutdown: enables lifecycle hooks for SIGTERM/SIGINT so
  // onApplicationShutdown implementations (Prisma disconnect, Playwright
  // browser close, open connections) run on kill/deploy.
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>("NODE_ENV", "development");
  const port = configService.get<number>("PORT", 3001);
  const corsOrigin = configService.get<string>(
    "CORS_ORIGIN",
    "http://localhost:3000"
  );

  // Allow inline invoice uploads (base64 JSON) up to 30 MB. The default
  // 100kb JSON body limit silently rejected real invoices (413), which the
  // frontend surfaced as a generic "فشل إضافة/حفظ المشتريات" message.
  app.use(json({ limit: "30mb" }));
  app.use(urlencoded({ extended: true, limit: "30mb" }));
  app.use(cookieParser());

  app.enableCors({
    origin: corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  });

  // Versioned global prefix
  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  if (nodeEnv !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("El Wataniya ERP API")
      .setDescription(
        "Production-grade Construction ERP backend API. Business modules will be added incrementally."
      )
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/v1/docs", app, document);
  }

  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  if (nodeEnv !== "production") {
    logger.log(`Swagger docs at http://localhost:${port}/api/v1/docs`);
  }
}

bootstrap();
