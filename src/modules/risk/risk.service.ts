import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import {
  RiskLevel,
  RiskPolicyStatus,
  SafetySeverity,
} from '../../common/enums/domain.enums';
import { AlertsService } from '../alerts/alerts.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SafetyEventEntity } from '../safety-events/safety-event.entity';
import { CreateRiskPolicyDto } from './dto/create-risk-policy.dto';
import { RiskPolicyQueryDto } from './dto/risk-policy-query.dto';
import { RiskSnapshotQueryDto } from './dto/risk-snapshot-query.dto';
import { RiskPolicyConfig, RiskPolicyEntity } from './risk-policy.entity';
import { RiskSnapshotEntity } from './risk-snapshot.entity';

@Injectable()
export class RiskService {
  constructor(
    @InjectRepository(RiskPolicyEntity)
    private readonly policies: Repository<RiskPolicyEntity>,
    @InjectRepository(RiskSnapshotEntity)
    private readonly snapshots: Repository<RiskSnapshotEntity>,
    @InjectRepository(SafetyEventEntity)
    private readonly safetyEvents: Repository<SafetyEventEntity>,
    private readonly alertsService: AlertsService,
    private readonly realtime: RealtimeService,
  ) {}

  async listPolicies(organizationId: string, query: RiskPolicyQueryDto) {
    const qb = this.policies
      .createQueryBuilder('policy')
      .where('policy.organization_id = :organizationId', { organizationId });
    if (query.status) qb.andWhere('policy.status = :status', { status: query.status });
    qb.orderBy('policy.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getActivePolicy(organizationId: string): Promise<RiskPolicyEntity | null> {
    return this.policies.findOne({
      where: { organizationId, status: RiskPolicyStatus.ACTIVE },
    });
  }

  async createPolicy(
    organizationId: string,
    dto: CreateRiskPolicyDto,
  ): Promise<RiskPolicyEntity> {
    const config = this.validatePolicyConfig(dto.config);
    const existing = await this.policies.findOne({
      where: { organizationId, name: dto.name.trim(), version: dto.version },
    });
    if (existing) throw new ConflictException('Risk policy name/version already exists');

    return this.policies.save(
      this.policies.create({
        organizationId,
        name: dto.name.trim(),
        version: dto.version,
        status: RiskPolicyStatus.DRAFT,
        config,
        activatedAt: null,
      }),
    );
  }

  async activatePolicy(organizationId: string, id: string): Promise<RiskPolicyEntity> {
    const policy = await this.policies.findOne({ where: { id, organizationId } });
    if (!policy) throw new NotFoundException('Risk policy not found');
    if (policy.status === RiskPolicyStatus.ACTIVE) return policy;
    if (policy.status !== RiskPolicyStatus.DRAFT) {
      throw new ConflictException('Only a DRAFT risk policy can be activated');
    }

    await this.policies.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(RiskPolicyEntity)
        .set({ status: RiskPolicyStatus.ARCHIVED })
        .where('organization_id = :organizationId', { organizationId })
        .andWhere('status = :status', { status: RiskPolicyStatus.ACTIVE })
        .execute();

      policy.status = RiskPolicyStatus.ACTIVE;
      policy.activatedAt = new Date();
      await manager.save(RiskPolicyEntity, policy);
    });

    this.realtime.publishOrganization(organizationId, 'risk.policy.activated', policy);
    return policy;
  }

  async listSnapshots(organizationId: string, query: RiskSnapshotQueryDto) {
    const qb = this.snapshots
      .createQueryBuilder('snapshot')
      .where('snapshot.organization_id = :organizationId', { organizationId });
    if (query.riskLevel) qb.andWhere('snapshot.risk_level = :riskLevel', { riskLevel: query.riskLevel });
    if (query.tripId) qb.andWhere('snapshot.trip_id = :tripId', { tripId: query.tripId });
    if (query.driverId) qb.andWhere('snapshot.driver_id = :driverId', { driverId: query.driverId });
    if (query.vehicleId) qb.andWhere('snapshot.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    if (query.from) qb.andWhere('snapshot.calculated_at >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('snapshot.calculated_at <= :to', { to: new Date(query.to) });
    qb.orderBy('snapshot.calculated_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async processSafetyEvent(event: SafetyEventEntity): Promise<RiskSnapshotEntity | null> {
    const existing = await this.snapshots.findOne({ where: { safetyEventId: event.id } });
    if (existing) return existing;

    const policy = await this.getActivePolicy(event.organizationId);
    if (!policy) return null;

    const config = this.validatePolicyConfig(policy.config as unknown as Record<string, unknown>);
    let riskLevel = config.severityMap[event.severity] as RiskLevel;
    let repeatedEventCount = 1;

    if (config.repeatWindowSeconds) {
      const from = new Date(event.capturedAt.getTime() - config.repeatWindowSeconds * 1000);
      const qb = this.safetyEvents
        .createQueryBuilder('event')
        .where('event.organization_id = :organizationId', { organizationId: event.organizationId })
        .andWhere('event.event_type = :eventType', { eventType: event.eventType })
        .andWhere('event.captured_at >= :from', { from })
        .andWhere('event.captured_at <= :to', { to: event.capturedAt });
      if (event.tripId) qb.andWhere('event.trip_id = :tripId', { tripId: event.tripId });
      else qb.andWhere('event.device_id = :deviceId', { deviceId: event.deviceId });
      repeatedEventCount = await qb.getCount();
    }

    for (const rule of [...(config.repeatEscalation ?? [])].sort(
      (a, b) => a.minEvents - b.minEvents,
    )) {
      if (repeatedEventCount >= rule.minEvents) {
        const candidate = rule.level as RiskLevel;
        if (this.rank(candidate) > this.rank(riskLevel)) riskLevel = candidate;
      }
    }

    const configuredScore = config.scoreByLevel?.[riskLevel];
    const snapshot = await this.snapshots.save(
      this.snapshots.create({
        organizationId: event.organizationId,
        tripId: event.tripId,
        driverId: event.driverId,
        vehicleId: event.vehicleId,
        safetyEventId: event.id,
        policyId: policy.id,
        policyVersion: policy.version,
        riskLevel,
        score: configuredScore ?? null,
        contributingFactors: {
          eventType: event.eventType,
          sourceSeverity: event.severity,
          sourceDrowsinessScore: event.drowsinessScore,
          repeatedEventCount,
          repeatWindowSeconds: config.repeatWindowSeconds ?? null,
          policyMode: config.mode,
        },
        calculatedAt: new Date(),
      }),
    );

    this.realtime.publishOrganization(event.organizationId, 'risk.updated', snapshot);
    await this.alertsService.processRiskSnapshot(
      snapshot,
      event,
      config.alertAtOrAbove as RiskLevel,
    );
    return snapshot;
  }

  private validatePolicyConfig(input: Record<string, unknown>): RiskPolicyConfig {
    if (input.mode !== 'SOURCE_SEVERITY') {
      throw new BadRequestException('Risk policy mode must be SOURCE_SEVERITY');
    }

    if (!input.severityMap || typeof input.severityMap !== 'object' || Array.isArray(input.severityMap)) {
      throw new BadRequestException('Risk policy severityMap is required');
    }
    const rawMap = input.severityMap as Record<string, unknown>;
    const severityMap: Record<string, string> = {};
    for (const severity of Object.values(SafetySeverity)) {
      const mapped = rawMap[severity];
      if (typeof mapped !== 'string' || !Object.values(RiskLevel).includes(mapped as RiskLevel)) {
        throw new BadRequestException(`severityMap.${severity} must be a valid risk level`);
      }
      severityMap[severity] = mapped;
    }

    if (
      typeof input.alertAtOrAbove !== 'string' ||
      !Object.values(RiskLevel).includes(input.alertAtOrAbove as RiskLevel)
    ) {
      throw new BadRequestException('alertAtOrAbove must be a valid risk level');
    }

    let scoreByLevel: Record<string, number> | undefined;
    if (input.scoreByLevel !== undefined) {
      if (typeof input.scoreByLevel !== 'object' || input.scoreByLevel === null || Array.isArray(input.scoreByLevel)) {
        throw new BadRequestException('scoreByLevel must be an object');
      }
      scoreByLevel = {};
      for (const [level, score] of Object.entries(input.scoreByLevel as Record<string, unknown>)) {
        if (!Object.values(RiskLevel).includes(level as RiskLevel)) {
          throw new BadRequestException(`Unknown scoreByLevel key: ${level}`);
        }
        if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
          throw new BadRequestException(`scoreByLevel.${level} must be between 0 and 100`);
        }
        scoreByLevel[level] = score;
      }
    }

    let repeatWindowSeconds: number | undefined;
    if (input.repeatWindowSeconds !== undefined) {
      if (
        typeof input.repeatWindowSeconds !== 'number' ||
        !Number.isInteger(input.repeatWindowSeconds) ||
        input.repeatWindowSeconds < 30 ||
        input.repeatWindowSeconds > 86400
      ) {
        throw new BadRequestException('repeatWindowSeconds must be an integer from 30 to 86400');
      }
      repeatWindowSeconds = input.repeatWindowSeconds;
    }

    let repeatEscalation: Array<{ minEvents: number; level: string }> | undefined;
    if (input.repeatEscalation !== undefined) {
      if (!Array.isArray(input.repeatEscalation)) {
        throw new BadRequestException('repeatEscalation must be an array');
      }
      repeatEscalation = input.repeatEscalation.map((raw) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          throw new BadRequestException('Each repeatEscalation rule must be an object');
        }
        const rule = raw as Record<string, unknown>;
        if (typeof rule.minEvents !== 'number' || !Number.isInteger(rule.minEvents) || rule.minEvents < 2) {
          throw new BadRequestException('repeatEscalation.minEvents must be an integer >= 2');
        }
        if (typeof rule.level !== 'string' || !Object.values(RiskLevel).includes(rule.level as RiskLevel)) {
          throw new BadRequestException('repeatEscalation.level must be a valid risk level');
        }
        return { minEvents: rule.minEvents, level: rule.level };
      });
    }

    return {
      mode: 'SOURCE_SEVERITY',
      severityMap,
      alertAtOrAbove: input.alertAtOrAbove,
      scoreByLevel,
      repeatWindowSeconds,
      repeatEscalation,
    };
  }

  private rank(level: RiskLevel): number {
    return {
      [RiskLevel.NORMAL]: 0,
      [RiskLevel.CAUTION]: 1,
      [RiskLevel.WARNING]: 2,
      [RiskLevel.CRITICAL]: 3,
    }[level];
  }
}
