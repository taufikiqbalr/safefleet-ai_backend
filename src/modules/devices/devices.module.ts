import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DriverEntity } from '../drivers/driver.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';
import { DeviceAuthGuard } from './device-auth.guard';
import { DeviceEntity } from './device.entity';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceEntity, DriverEntity, VehicleEntity])],
  controllers: [DevicesController],
  providers: [DevicesService, DeviceAuthGuard],
  exports: [TypeOrmModule, DevicesService, DeviceAuthGuard],
})
export class DevicesModule {}
