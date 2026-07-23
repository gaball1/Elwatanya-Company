import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { HealthModule } from "./health/health.module";
import { ProjectModule } from "./modules/project/project.module";
import { BuildingModule } from "./modules/building/building.module";
import { EmployerBoqModule } from "./modules/employer-boq/employer-boq.module";
import { AnalyticalBoqModule } from "./modules/analytical-boq/analytical-boq.module";
import { FinalBoqModule } from "./modules/final-boq/final-boq.module";
import { SubcontractorModule } from "./modules/subcontractor/subcontractor.module";
import { ContractorBoqModule } from "./modules/contractor-boq/contractor-boq.module";
import { DistributionModule } from "./modules/distribution/distribution.module";
import { ExtractModule } from "./modules/extract/extract.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { LoggerModule } from "nestjs-pino";
@Module({
  imports: [
    LoggerModule.forRoot(),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    ProjectModule,
    BuildingModule,
    EmployerBoqModule,
    AnalyticalBoqModule,
    FinalBoqModule,
    SubcontractorModule,
    ContractorBoqModule,
    DistributionModule,
    ExtractModule,
    PaymentModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
