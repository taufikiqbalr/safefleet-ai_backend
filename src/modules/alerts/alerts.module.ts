import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RealtimeModule } from '../realtime/realtime.module';
import { UserEntity } from '../users/user.entity';
import { AlertStatusHistoryEntity } from './alert-status-history.entity';
import { AlertEntity } from './alert.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [
    RealtimeModule,
    TypeOrmModule.forFeature([AlertEntity, AlertStatusHistoryEntity, UserEntity]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService, TypeOrmModule],
})
export class AlertsModule {}
