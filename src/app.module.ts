import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { validateEnvironment } from './common/config/env.validation';
import { createTypeOrmOptions } from './database/typeorm.config';
import { HealthModule } from './health/health.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DeviceRuntimeModule } from './modules/device-runtime/device-runtime.module';
import { DevicesModule } from './modules/devices/devices.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { DrowsinessModule } from './modules/drowsiness/drowsiness.module';
import { FleetsModule } from './modules/fleets/fleets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RiskModule } from './modules/risk/risk.module';
import { SafetyEventsModule } from './modules/safety-events/safety-events.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { TripsModule } from './modules/trips/trips.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmOptions,
    }),
    HealthModule,
    AuthModule,
    AuditModule,
    OrganizationsModule,
    UsersModule,
    FleetsModule,
    DriversModule,
    VehiclesModule,
    DevicesModule,
    DeviceRuntimeModule,
    AssignmentsModule,
    TripsModule,
    TelemetryModule,
    SafetyEventsModule,
    DrowsinessModule,
    SensorsModule,
    RiskModule,
    AlertsModule,
    RealtimeModule,
    NotificationsModule,
    DashboardModule,
    AnalyticsModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
