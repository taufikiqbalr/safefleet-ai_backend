import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SafetyEventEntity } from './safety-event.entity';
import { SafetyEventsController } from './safety-events.controller';
import { SafetyEventsService } from './safety-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([SafetyEventEntity])],
  controllers: [SafetyEventsController],
  providers: [SafetyEventsService],
  exports: [TypeOrmModule, SafetyEventsService],
})
export class SafetyEventsModule {}
