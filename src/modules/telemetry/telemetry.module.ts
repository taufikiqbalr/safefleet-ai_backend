import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevicesModule } from '../devices/devices.module';
import { TripEntity } from '../trips/trip.entity';
import { DeviceTelemetryController } from './device-telemetry.controller';
import { TelemetryPointEntity } from './telemetry-point.entity';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [DevicesModule, TypeOrmModule.forFeature([TelemetryPointEntity, TripEntity])],
  controllers: [TelemetryController, DeviceTelemetryController],
  providers: [TelemetryService],
  exports: [TypeOrmModule, TelemetryService],
})
export class TelemetryModule {}
