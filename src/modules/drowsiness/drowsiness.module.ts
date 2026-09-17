import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevicesModule } from '../devices/devices.module';
import { SafetyEventEntity } from '../safety-events/safety-event.entity';
import { TripEntity } from '../trips/trip.entity';
import { DeviceDrowsinessController, DrowsinessEventsController } from './drowsiness.controller';
import { DrowsinessEventDetailEntity } from './drowsiness-event-detail.entity';
import { DrowsinessService } from './drowsiness.service';

@Module({
  imports: [
    DevicesModule,
    TypeOrmModule.forFeature([SafetyEventEntity, DrowsinessEventDetailEntity, TripEntity]),
  ],
  controllers: [DeviceDrowsinessController, DrowsinessEventsController],
  providers: [DrowsinessService],
  exports: [TypeOrmModule, DrowsinessService],
})
export class DrowsinessModule {}
