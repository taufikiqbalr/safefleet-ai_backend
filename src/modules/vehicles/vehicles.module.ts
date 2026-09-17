import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FleetEntity } from '../fleets/fleet.entity';
import { VehicleEntity } from './vehicle.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleEntity, FleetEntity])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [TypeOrmModule, VehiclesService],
})
export class VehiclesModule {}
