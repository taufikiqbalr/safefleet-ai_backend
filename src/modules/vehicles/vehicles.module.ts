import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VehicleEntity } from './vehicle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleEntity])],
  exports: [TypeOrmModule],
})
export class VehiclesModule {}
