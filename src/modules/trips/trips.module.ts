import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TripEntity } from './trip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TripEntity])],
  exports: [TypeOrmModule],
})
export class TripsModule {}
