import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssignmentEntity } from '../assignments/assignment.entity';
import { DeviceEntity } from '../devices/device.entity';
import { DriverEntity } from '../drivers/driver.entity';
import { FleetEntity } from '../fleets/fleet.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';
import { TripEntity } from './trip.entity';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripEntity,
      DriverEntity,
      VehicleEntity,
      DeviceEntity,
      AssignmentEntity,
      FleetEntity,
    ]),
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TypeOrmModule, TripsService],
})
export class TripsModule {}
