import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeviceEntity } from '../devices/device.entity';
import { DriverEntity } from '../drivers/driver.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';
import { AssignmentEntity } from './assignment.entity';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssignmentEntity, DriverEntity, VehicleEntity, DeviceEntity])],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [TypeOrmModule, AssignmentsService],
})
export class AssignmentsModule {}
