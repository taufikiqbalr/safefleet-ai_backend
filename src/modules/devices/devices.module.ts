import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DriverEntity } from '../drivers/driver.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';
import { DeviceEntity } from './device.entity';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceEntity, DriverEntity, VehicleEntity])],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [TypeOrmModule, DevicesService],
})
export class DevicesModule {}
