import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DriverEntity } from './driver.entity';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [TypeOrmModule.forFeature([DriverEntity])],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [TypeOrmModule, DriversService],
})
export class DriversModule {}
