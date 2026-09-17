import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateSafetyEventFeedbackDto } from './dto/create-safety-event-feedback.dto';
import { SafetyEventQueryDto } from './dto/safety-event-query.dto';
import { SafetyEventFeedbackEntity } from './safety-event-feedback.entity';
import { SafetyEventEntity } from './safety-event.entity';

@Injectable()
export class SafetyEventsService {
  constructor(
    @InjectRepository(SafetyEventEntity)
    private readonly safetyEvents: Repository<SafetyEventEntity>,
    @InjectRepository(SafetyEventFeedbackEntity)
    private readonly feedback: Repository<SafetyEventFeedbackEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async list(organizationId: string, query: SafetyEventQueryDto) {
    const qb = this.safetyEvents
      .createQueryBuilder('event')
      .where('event.organization_id = :organizationId', { organizationId });

    if (query.eventType) qb.andWhere('event.event_type = :eventType', { eventType: query.eventType });
    if (query.severity) qb.andWhere('event.severity = :severity', { severity: query.severity });
    if (query.deviceId) qb.andWhere('event.device_id = :deviceId', { deviceId: query.deviceId });
    if (query.tripId) qb.andWhere('event.trip_id = :tripId', { tripId: query.tripId });
    if (query.driverId) qb.andWhere('event.driver_id = :driverId', { driverId: query.driverId });
    if (query.vehicleId) qb.andWhere('event.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    if (query.from) qb.andWhere('event.captured_at >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('event.captured_at <= :to', { to: new Date(query.to) });

    qb.orderBy('event.captured_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getById(organizationId: string, id: string): Promise<SafetyEventEntity> {
    const event = await this.safetyEvents.findOne({ where: { id, organizationId } });
    if (!event) throw new NotFoundException('Safety event not found');
    return event;
  }

  async addFeedback(
    organizationId: string,
    safetyEventId: string,
    reviewerUserId: string,
    dto: CreateSafetyEventFeedbackDto,
  ): Promise<SafetyEventFeedbackEntity> {
    await this.getById(organizationId, safetyEventId);
    const item = await this.feedback.save(
      this.feedback.create({
        organizationId,
        safetyEventId,
        reviewerUserId,
        classification: dto.classification,
        reason: dto.reason?.trim() || null,
      }),
    );
    this.realtime.publishOrganization(organizationId, 'safety.event.feedback.created', item);
    return item;
  }

  async listFeedback(organizationId: string, safetyEventId: string) {
    await this.getById(organizationId, safetyEventId);
    return this.feedback.find({
      where: { organizationId, safetyEventId },
      order: { createdAt: 'DESC' },
    });
  }
}
