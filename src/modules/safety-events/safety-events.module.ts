import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SafetyEventFeedbackEntity } from './safety-event-feedback.entity';
import { SafetyEventEntity } from './safety-event.entity';
import { SafetyEventsController } from './safety-events.controller';
import { SafetyEventsService } from './safety-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([SafetyEventEntity, SafetyEventFeedbackEntity])],
  controllers: [SafetyEventsController],
  providers: [SafetyEventsService],
  exports: [TypeOrmModule, SafetyEventsService],
})
export class SafetyEventsModule {}
