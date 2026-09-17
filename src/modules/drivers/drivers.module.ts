import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DriverEntity } from './driver.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DriverEntity])],
  exports: [TypeOrmModule],
})
export class DriversModule {}
