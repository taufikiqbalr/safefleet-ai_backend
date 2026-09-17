import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AlertsModule } from '../alerts/alerts.module';
import { SafetyEventEntity } from '../safety-events/safety-event.entity';
import { RiskController } from './risk.controller';
import { RiskPolicyEntity } from './risk-policy.entity';
import { RiskSnapshotEntity } from './risk-snapshot.entity';
import { RiskService } from './risk.service';

@Module({
  imports: [
    AlertsModule,
    TypeOrmModule.forFeature([RiskPolicyEntity, RiskSnapshotEntity, SafetyEventEntity]),
  ],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService, TypeOrmModule],
})
export class RiskModule {}
