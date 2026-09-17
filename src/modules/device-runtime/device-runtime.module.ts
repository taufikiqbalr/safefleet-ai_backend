import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssignmentEntity } from '../assignments/assignment.entity';
import { DeviceEntity } from '../devices/device.entity';
import { DevicesModule } from '../devices/devices.module';
import { DriverEntity } from '../drivers/driver.entity';
import { FleetEntity } from '../fleets/fleet.entity';
import { TripEntity } from '../trips/trip.entity';
import { TripsModule } from '../trips/trips.module';
import { VehicleEntity } from '../vehicles/vehicle.entity';
import { DeviceRuntimeController } from './device-runtime.controller';
import { DeviceRuntimeService } from './device-runtime.service';

@Module({
  imports: [
    DevicesModule,
    TripsModule,
    TypeOrmModule.forFeature([
      DeviceEntity,
      AssignmentEntity,
      DriverEntity,
      VehicleEntity,
      FleetEntity,
      TripEntity,
    ]),
  ],
  controllers: [DeviceRuntimeController],
  providers: [DeviceRuntimeService],
})
export class DeviceRuntimeModule {}
