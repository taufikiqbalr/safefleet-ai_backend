import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { AuthenticatedDevice } from '../../common/auth/authenticated-device.interface';
import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { DevicesService } from '../devices/devices.service';
import { TripEntity } from '../trips/trip.entity';
import { TelemetryBatchDto } from './dto/telemetry-batch.dto';
import { TelemetryPointDto } from './dto/telemetry-point.dto';
import { TelemetryQueryDto } from './dto/telemetry-query.dto';
import { TelemetryPointEntity } from './telemetry-point.entity';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(TelemetryPointEntity)
    private readonly telemetry: Repository<TelemetryPointEntity>,
    @InjectRepository(TripEntity)
    private readonly trips: Repository<TripEntity>,
    private readonly devicesService: DevicesService,
  ) {}

  async list(organizationId: string, query: TelemetryQueryDto) {
    const qb = this.telemetry
      .createQueryBuilder('telemetry')
      .where('telemetry.organization_id = :organizationId', { organizationId });

    if (query.deviceId) qb.andWhere('telemetry.device_id = :deviceId', { deviceId: query.deviceId });
    if (query.tripId) qb.andWhere('telemetry.trip_id = :tripId', { tripId: query.tripId });
    if (query.driverId) qb.andWhere('telemetry.driver_id = :driverId', { driverId: query.driverId });
    if (query.vehicleId) qb.andWhere('telemetry.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    if (query.from) qb.andWhere('telemetry.captured_at >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('telemetry.captured_at <= :to', { to: new Date(query.to) });

    qb.orderBy('telemetry.captured_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async ingestBatch(device: AuthenticatedDevice, dto: TelemetryBatchDto) {
    const results: Array<{
      clientEventId: string;
      status: 'ACCEPTED' | 'DUPLICATE' | 'REJECTED';
      id?: string;
      error?: string;
    }> = [];

    let latestAppVersion: string | undefined;
    let latestModelVersion: string | undefined;

    for (const point of dto.points) {
      try {
        const result = await this.ingestOne(device, point, dto.syncBatchId);
        results.push(result);
        if (point.appVersion) latestAppVersion = point.appVersion;
        if (point.modelVersion) latestModelVersion = point.modelVersion;
      } catch (error) {
        results.push({
          clientEventId: point.clientEventId,
          status: 'REJECTED',
          error: error instanceof Error ? error.message : 'Unable to ingest telemetry point',
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
    point: TelemetryPointDto,
    syncBatchId?: string,
  ) {
    const existing = await this.telemetry.findOne({
      where: { deviceId: device.deviceId, clientEventId: point.clientEventId },
    });
    if (existing) {
      return { clientEventId: point.clientEventId, status: 'DUPLICATE' as const, id: existing.id };
    }

    const context = await this.resolveContext(device, point.tripId);
    const entity = this.telemetry.create({
      organizationId: device.organizationId,
      deviceId: device.deviceId,
      tripId: point.tripId ?? null,
      driverId: context.driverId,
      vehicleId: context.vehicleId,
      clientEventId: point.clientEventId,
      syncBatchId: syncBatchId ?? null,
      sequenceNumber: point.sequenceNumber ?? null,
      capturedAt: new Date(point.capturedAt),
      receivedAt: new Date(),
      latitude: point.latitude ?? null,
      longitude: point.longitude ?? null,
      speedKph: point.speedKph ?? null,
      batteryPercent: point.batteryPercent ?? null,
      networkType: point.networkType?.trim() || null,
      appVersion: point.appVersion?.trim() || null,
      modelVersion: point.modelVersion?.trim() || null,
      inferenceLatencyMs: point.inferenceLatencyMs ?? null,
      metadata: point.metadata ?? {},
    });

    try {
      const saved = await this.telemetry.save(entity);
      return { clientEventId: point.clientEventId, status: 'ACCEPTED' as const, id: saved.id };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const duplicate = await this.telemetry.findOne({
          where: { deviceId: device.deviceId, clientEventId: point.clientEventId },
        });
        return {
          clientEventId: point.clientEventId,
          status: 'DUPLICATE' as const,
          id: duplicate?.id,
        };
      }
      throw error;
    }
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
