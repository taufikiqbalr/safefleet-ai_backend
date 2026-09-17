import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevicesModule } from '../devices/devices.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RiskModule } from '../risk/risk.module';
import { SafetyEventEntity } from '../safety-events/safety-event.entity';
import { TripEntity } from '../trips/trip.entity';
import { DeviceDrowsinessController, DrowsinessEventsController } from './drowsiness.controller';
import { DrowsinessEventDetailEntity } from './drowsiness-event-detail.entity';
import { DrowsinessService } from './drowsiness.service';

@Module({
  imports: [
    DevicesModule,
    RiskModule,
    RealtimeModule,
    TypeOrmModule.forFeature([SafetyEventEntity, DrowsinessEventDetailEntity, TripEntity]),
  ],
  controllers: [DeviceDrowsinessController, DrowsinessEventsController],
  providers: [DrowsinessService],
  exports: [TypeOrmModule, DrowsinessService],
})
export class DrowsinessModule {}
