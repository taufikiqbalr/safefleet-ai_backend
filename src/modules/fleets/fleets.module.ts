import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FleetEntity } from './fleet.entity';
import { FleetsController } from './fleets.controller';
import { FleetsService } from './fleets.service';

@Module({
  imports: [TypeOrmModule.forFeature([FleetEntity])],
  controllers: [FleetsController],
  providers: [FleetsService],
  exports: [TypeOrmModule, FleetsService],
})
export class FleetsModule {}
