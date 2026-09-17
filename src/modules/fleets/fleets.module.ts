import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FleetEntity } from './fleet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FleetEntity])],
  exports: [TypeOrmModule],
})
export class FleetsModule {}
