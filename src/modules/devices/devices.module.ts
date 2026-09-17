import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeviceEntity } from './device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceEntity])],
  exports: [TypeOrmModule],
})
export class DevicesModule {}
