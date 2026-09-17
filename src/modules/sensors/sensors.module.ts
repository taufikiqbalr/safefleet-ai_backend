import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevicesModule } from '../devices/devices.module';
import { TripEntity } from '../trips/trip.entity';
import { SensorReadingEntity } from './sensor-reading.entity';
import { DeviceSensorsController, SensorReadingsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

@Module({
  imports: [DevicesModule, TypeOrmModule.forFeature([SensorReadingEntity, TripEntity])],
  controllers: [DeviceSensorsController, SensorReadingsController],
  providers: [SensorsService],
  exports: [TypeOrmModule, SensorsService],
})
export class SensorsModule {}
