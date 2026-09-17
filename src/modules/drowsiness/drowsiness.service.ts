import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { AuthenticatedDevice } from '../../common/auth/authenticated-device.interface';
import { SafetyEventType } from '../../common/enums/domain.enums';
import { DevicesService } from '../devices/devices.service';
import { RealtimeService } from '../realtime/realtime.service';
import { RiskService } from '../risk/risk.service';
import { SafetyEventEntity } from '../safety-events/safety-event.entity';
import { TripEntity } from '../trips/trip.entity';
import { DrowsinessEventDetailEntity } from './drowsiness-event-detail.entity';
import { DrowsinessBatchDto } from './dto/drowsiness-batch.dto';
import { DrowsinessEventDto } from './dto/drowsiness-event.dto';

@Injectable()
export class DrowsinessService {
  constructor(
    @InjectRepository(SafetyEventEntity)
    private readonly safetyEvents: Repository<SafetyEventEntity>,
    @InjectRepository(DrowsinessEventDetailEntity)
    private readonly details: Repository<DrowsinessEventDetailEntity>,
    @InjectRepository(TripEntity)
    private readonly trips: Repository<TripEntity>,
    private readonly devicesService: DevicesService,
    private readonly riskService: RiskService,
    private readonly realtime: RealtimeService,
    private readonly dataSource: DataSource,
  ) {}

  async getDetail(organizationId: string, safetyEventId: string) {
    const event = await this.safetyEvents.findOne({
      where: { id: safetyEventId, organizationId, eventType: SafetyEventType.DROWSINESS },
    });
    if (!event) throw new NotFoundException('Drowsiness safety event not found');

    const detail = await this.details.findOne({ where: { safetyEventId } });
    return { event, detail };
  }

  async ingestBatch(device: AuthenticatedDevice, dto: DrowsinessBatchDto) {
    const results: Array<{
      clientEventId: string;
      status: 'ACCEPTED' | 'DUPLICATE' | 'REJECTED';
      id?: string;
      error?: string;
    }> = [];

    let latestAppVersion: string | undefined;
    let latestModelVersion: string | undefined;

    for (const event of dto.events) {
      try {
        const result = await this.ingestOne(device, event, dto.syncBatchId);
        results.push(result);
        if (event.appVersion) latestAppVersion = event.appVersion;
        if (event.modelVersion) latestModelVersion = event.modelVersion;
      } catch (error) {
        results.push({
          clientEventId: event.clientEventId,
          status: 'REJECTED',
          error: error instanceof Error ? error.message : 'Unable to ingest drowsiness event',
        });
      }
    }

    await this.devicesService.touchDevice(device.deviceId, {
      appVersion: latestAppVersion,
      modelVersion: latestModelVersion,
    });

    return {
      syncBatchId: dto.syncBatchId ?? null,
      accepted: results.filter((item) => item.status === 'ACCEPTED').length,
      duplicates: results.filter((item) => item.status === 'DUPLICATE').length,
      rejected: results.filter((item) => item.status === 'REJECTED').length,
      results,
    };
  }

  private async ingestOne(
    device: AuthenticatedDevice,
    dto: DrowsinessEventDto,
    syncBatchId?: string,
  ) {
    const existing = await this.safetyEvents.findOne({
      where: { deviceId: device.deviceId, clientEventId: dto.clientEventId },
    });
    if (existing) {
      await this.processIntelligence(existing);
      return { clientEventId: dto.clientEventId, status: 'DUPLICATE' as const, id: existing.id };
    }

    const context = await this.resolveContext(device, dto.tripId);

    try {
      const safetyEvent = await this.dataSource.transaction(async (manager) => {
        const event = manager.create(SafetyEventEntity, {
          organizationId: device.organizationId,
          deviceId: device.deviceId,
          tripId: dto.tripId ?? null,
          driverId: context.driverId,
          vehicleId: context.vehicleId,
          clientEventId: dto.clientEventId,
          syncBatchId: syncBatchId ?? null,
          sequenceNumber: dto.sequenceNumber ?? null,
          eventType: SafetyEventType.DROWSINESS,
          severity: dto.severity,
          sourceAlertLevel: dto.sourceAlertLevel?.trim() || null,
          drowsinessScore: dto.drowsinessScore ?? null,
          localAlarmTriggered: dto.localAlarmTriggered ?? null,
          thresholdProfile: dto.thresholdProfile?.trim() || null,
          capturedAt: new Date(dto.capturedAt),
          receivedAt: new Date(),
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          appVersion: dto.appVersion?.trim() || null,
          modelVersion: dto.modelVersion?.trim() || null,
          inferenceLatencyMs: dto.inferenceLatencyMs ?? null,
          metadata: dto.metadata ?? {},
        });
        const savedEvent = await manager.save(SafetyEventEntity, event);

        const detail = manager.create(DrowsinessEventDetailEntity, {
          safetyEventId: savedEvent.id,
          eyeAspectRatio: dto.eyeAspectRatio ?? null,
          mouthAspectRatio: dto.mouthAspectRatio ?? null,
          perclosPercent: dto.perclosPercent ?? null,
          blinkRatePerMinute: dto.blinkRatePerMinute ?? null,
          eyeClosureDurationMs: dto.eyeClosureDurationMs ?? null,
          yawning: dto.yawning ?? null,
          yawnDurationMs: dto.yawnDurationMs ?? null,
          headPitchDeg: dto.headPitchDeg ?? null,
          headYawDeg: dto.headYawDeg ?? null,
          headRollDeg: dto.headRollDeg ?? null,
          faceDetected: dto.faceDetected ?? null,
        });
        await manager.save(DrowsinessEventDetailEntity, detail);
        return savedEvent;
      });

      await this.processIntelligence(safetyEvent);
      return { clientEventId: dto.clientEventId, status: 'ACCEPTED' as const, id: safetyEvent.id };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const duplicate = await this.safetyEvents.findOne({
          where: { deviceId: device.deviceId, clientEventId: dto.clientEventId },
        });
        if (duplicate) await this.processIntelligence(duplicate);
        return {
          clientEventId: dto.clientEventId,
          status: 'DUPLICATE' as const,
          id: duplicate?.id,
        };
      }
      throw error;
    }
  }

  private async processIntelligence(event: SafetyEventEntity): Promise<void> {
    this.realtime.publishOrganization(event.organizationId, 'safety.event.created', event);
    await this.riskService.processSafetyEvent(event);
  }

  private async resolveContext(device: AuthenticatedDevice, tripId?: string) {
    if (!tripId) {
      return { driverId: device.driverId, vehicleId: device.vehicleId };
    }

    const trip = await this.trips.findOne({
      where: { id: tripId, organizationId: device.organizationId },
    });
    if (!trip) throw new NotFoundException('Trip not found for this device organization');
    if (trip.deviceId && trip.deviceId !== device.deviceId) {
      throw new ConflictException('Trip is assigned to a different device');
    }
    if (device.driverId && trip.driverId !== device.driverId) {
      throw new ConflictException('Trip driver does not match the authenticated device');
    }
    if (device.vehicleId && trip.vehicleId !== device.vehicleId) {
      throw new ConflictException('Trip vehicle does not match the authenticated device');
    }

    return { driverId: trip.driverId, vehicleId: trip.vehicleId };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505'
    );
  }
}
