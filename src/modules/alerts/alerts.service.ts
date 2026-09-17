import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { AlertStatus, RiskLevel, UserStatus } from '../../common/enums/domain.enums';
import { RealtimeService } from '../realtime/realtime.service';
import { RiskSnapshotEntity } from '../risk/risk-snapshot.entity';
import { SafetyEventEntity } from '../safety-events/safety-event.entity';
import { UserEntity } from '../users/user.entity';
import { AlertStatusHistoryEntity } from './alert-status-history.entity';
import { AlertEntity } from './alert.entity';
import { AlertActionDto } from './dto/alert-action.dto';
import { AlertQueryDto } from './dto/alert-query.dto';
import { AssignAlertDto } from './dto/assign-alert.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertEntity)
    private readonly alerts: Repository<AlertEntity>,
    @InjectRepository(AlertStatusHistoryEntity)
    private readonly history: Repository<AlertStatusHistoryEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async list(organizationId: string, query: AlertQueryDto) {
    const qb = this.alerts
      .createQueryBuilder('alert')
      .where('alert.organization_id = :organizationId', { organizationId });
    if (query.status) qb.andWhere('alert.status = :status', { status: query.status });
    if (query.severity) qb.andWhere('alert.severity = :severity', { severity: query.severity });
    if (query.tripId) qb.andWhere('alert.trip_id = :tripId', { tripId: query.tripId });
    if (query.driverId) qb.andWhere('alert.driver_id = :driverId', { driverId: query.driverId });
    if (query.vehicleId) qb.andWhere('alert.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    if (query.assignedToUserId) {
      qb.andWhere('alert.assigned_to_user_id = :assignedToUserId', {
        assignedToUserId: query.assignedToUserId,
      });
    }
    if (query.from) qb.andWhere('alert.created_at >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('alert.created_at <= :to', { to: new Date(query.to) });
    qb.orderBy('alert.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getById(organizationId: string, id: string): Promise<AlertEntity> {
    const alert = await this.alerts.findOne({ where: { id, organizationId } });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async getHistory(organizationId: string, alertId: string) {
    await this.getById(organizationId, alertId);
    return this.history.find({ where: { organizationId, alertId }, order: { createdAt: 'ASC' } });
  }

  async assign(organizationId: string, id: string, dto: AssignAlertDto): Promise<AlertEntity> {
    const alert = await this.getById(organizationId, id);
    if (alert.status === AlertStatus.RESOLVED) {
      throw new ConflictException('Resolved alerts cannot be reassigned');
    }

    if (dto.userId) {
      const user = await this.users.findOne({
        where: { id: dto.userId, organizationId, status: UserStatus.ACTIVE },
      });
      if (!user) throw new NotFoundException('Active assignee not found in this organization');
      alert.assignedToUserId = user.id;
      alert.assignedAt = new Date();
    } else {
      alert.assignedToUserId = null;
      alert.assignedAt = null;
    }

    const saved = await this.alerts.save(alert);
    this.realtime.publishOrganization(organizationId, 'alert.updated', {
      ...saved,
      assignmentNote: dto.note?.trim() || null,
    });
    return saved;
  }

  async processRiskSnapshot(
    snapshot: RiskSnapshotEntity,
    event: SafetyEventEntity,
    alertThreshold: RiskLevel,
  ): Promise<AlertEntity | null> {
    if (this.rank(snapshot.riskLevel) < this.rank(alertThreshold)) return null;

    const dedupeKey = `DROWSINESS_RISK:${event.tripId ?? `device:${event.deviceId}`}`;
    const activeStatuses = [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED];
    const existing = await this.alerts.findOne({
      where: {
        organizationId: event.organizationId,
        dedupeKey,
        status: In(activeStatuses),
      },
    });

    if (existing) {
      existing.occurrenceCount += 1;
      existing.lastEventAt = event.capturedAt;
      existing.safetyEventId = event.id;
      existing.riskSnapshotId = snapshot.id;
      if (this.rank(snapshot.riskLevel) > this.rank(existing.severity)) {
        existing.severity = snapshot.riskLevel;
      }
      const saved = await this.alerts.save(existing);
      this.realtime.publishOrganization(event.organizationId, 'alert.updated', saved);
      return saved;
    }

    const alert = await this.alerts.save(
      this.alerts.create({
        organizationId: event.organizationId,
        tripId: event.tripId,
        driverId: event.driverId,
        vehicleId: event.vehicleId,
        safetyEventId: event.id,
        riskSnapshotId: snapshot.id,
        alertType: 'DROWSINESS_RISK',
        severity: snapshot.riskLevel,
        status: AlertStatus.OPEN,
        title: 'Driver safety risk requires review',
        message: `Risk policy classified a ${event.eventType} event as ${snapshot.riskLevel}.`,
        dedupeKey,
        occurrenceCount: 1,
        firstEventAt: event.capturedAt,
        lastEventAt: event.capturedAt,
        assignedToUserId: null,
        assignedAt: null,
        acknowledgedByUserId: null,
        acknowledgedAt: null,
        resolvedByUserId: null,
        resolvedAt: null,
        resolutionNotes: null,
      }),
    );

    await this.history.save(
      this.history.create({
        organizationId: alert.organizationId,
        alertId: alert.id,
        fromStatus: null,
        toStatus: AlertStatus.OPEN,
        actorUserId: null,
        note: 'Created automatically by active risk policy',
      }),
    );
    this.realtime.publishOrganization(event.organizationId, 'alert.created', alert);
    return alert;
  }

  async acknowledge(
    organizationId: string,
    id: string,
    actorUserId: string,
    dto: AlertActionDto,
  ): Promise<AlertEntity> {
    const alert = await this.getById(organizationId, id);
    if (alert.status === AlertStatus.ACKNOWLEDGED) return alert;
    if (alert.status === AlertStatus.RESOLVED) {
      throw new ConflictException('Resolved alerts cannot be acknowledged');
    }
    return this.transition(alert, AlertStatus.ACKNOWLEDGED, actorUserId, dto.note);
  }

  async escalate(
    organizationId: string,
    id: string,
    actorUserId: string,
    dto: AlertActionDto,
  ): Promise<AlertEntity> {
    const alert = await this.getById(organizationId, id);
    if (alert.status === AlertStatus.ESCALATED) return alert;
    if (alert.status === AlertStatus.RESOLVED) {
      throw new ConflictException('Resolved alerts cannot be escalated');
    }
    return this.transition(alert, AlertStatus.ESCALATED, actorUserId, dto.note);
  }

  async resolve(
    organizationId: string,
    id: string,
    actorUserId: string,
    dto: AlertActionDto,
  ): Promise<AlertEntity> {
    const alert = await this.getById(organizationId, id);
    if (alert.status === AlertStatus.RESOLVED) return alert;
    alert.resolvedByUserId = actorUserId;
    alert.resolvedAt = new Date();
    alert.resolutionNotes = dto.note?.trim() || null;
    return this.transition(alert, AlertStatus.RESOLVED, actorUserId, dto.note);
  }

  private async transition(
    alert: AlertEntity,
    toStatus: AlertStatus,
    actorUserId: string,
    note?: string,
  ): Promise<AlertEntity> {
    const fromStatus = alert.status;
    alert.status = toStatus;
    if (toStatus === AlertStatus.ACKNOWLEDGED) {
      alert.acknowledgedByUserId = actorUserId;
      alert.acknowledgedAt = new Date();
    }
    const saved = await this.alerts.save(alert);
    await this.history.save(
      this.history.create({
        organizationId: alert.organizationId,
        alertId: alert.id,
        fromStatus,
        toStatus,
        actorUserId,
        note: note?.trim() || null,
      }),
    );
    this.realtime.publishOrganization(alert.organizationId, 'alert.updated', saved);
    return saved;
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
