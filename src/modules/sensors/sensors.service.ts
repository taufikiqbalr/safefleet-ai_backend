import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { AuthenticatedDevice } from '../../common/auth/authenticated-device.interface';
import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { DevicesService } from '../devices/devices.service';
import { RealtimeService } from '../realtime/realtime.service';
import { TripEntity } from '../trips/trip.entity';
import { SensorBatchDto } from './dto/sensor-batch.dto';
import { SensorQueryDto } from './dto/sensor-query.dto';
import { SensorReadingDto } from './dto/sensor-reading.dto';
import { SensorReadingEntity } from './sensor-reading.entity';

@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(SensorReadingEntity)
    private readonly readings: Repository<SensorReadingEntity>,
    @InjectRepository(TripEntity)
    private readonly trips: Repository<TripEntity>,
    private readonly devicesService: DevicesService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(organizationId: string, query: SensorQueryDto) {
    const qb = this.readings
      .createQueryBuilder('reading')
      .where('reading.organization_id = :organizationId', { organizationId });
    if (query.deviceId) qb.andWhere('reading.device_id = :deviceId', { deviceId: query.deviceId });
    if (query.tripId) qb.andWhere('reading.trip_id = :tripId', { tripId: query.tripId });
    if (query.driverId) qb.andWhere('reading.driver_id = :driverId', { driverId: query.driverId });
    if (query.vehicleId) qb.andWhere('reading.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    if (query.sensorType) qb.andWhere('reading.sensor_type = :sensorType', { sensorType: query.sensorType });
    if (query.from) qb.andWhere('reading.captured_at >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('reading.captured_at <= :to', { to: new Date(query.to) });
    qb.orderBy('reading.captured_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async ingestBatch(device: AuthenticatedDevice, dto: SensorBatchDto) {
    const results: Array<{
      clientEventId: string;
      status: 'ACCEPTED' | 'DUPLICATE' | 'REJECTED';
      id?: string;
      error?: string;
    }> = [];

    for (const reading of dto.readings) {
      try {
        results.push(await this.ingestOne(device, reading, dto.syncBatchId));
      } catch (error) {
        results.push({
          clientEventId: reading.clientEventId,
          status: 'REJECTED',
          error: error instanceof Error ? error.message : 'Unable to ingest sensor reading',
        });
      }
    }

    await this.devicesService.touchDevice(device.deviceId);
    const accepted = results.filter((item) => item.status === 'ACCEPTED').length;
    if (accepted > 0) {
      const latest = await this.readings.findOne({
        where: { deviceId: device.deviceId },
        order: { capturedAt: 'DESC' },
      });
      if (latest) {
        this.realtime.publishOrganization(device.organizationId, 'sensor.reading.updated', latest);
      }
    }

    return {
      syncBatchId: dto.syncBatchId ?? null,
      accepted,
      duplicates: results.filter((item) => item.status === 'DUPLICATE').length,
      rejected: results.filter((item) => item.status === 'REJECTED').length,
      results,
    };
  }

  private async ingestOne(
    device: AuthenticatedDevice,
    dto: SensorReadingDto,
    syncBatchId?: string,
  ) {
    const existing = await this.readings.findOne({
      where: { deviceId: device.deviceId, clientEventId: dto.clientEventId },
    });
    if (existing) {
      return { clientEventId: dto.clientEventId, status: 'DUPLICATE' as const, id: existing.id };
    }

    const context = await this.resolveContext(device, dto.tripId);
    const entity = this.readings.create({
      organizationId: device.organizationId,
      deviceId: device.deviceId,
      tripId: dto.tripId ?? null,
      driverId: context.driverId,
      vehicleId: context.vehicleId,
      clientEventId: dto.clientEventId,
      syncBatchId: syncBatchId ?? null,
      sequenceNumber: dto.sequenceNumber ?? null,
      sensorId: dto.sensorId.trim(),
      sensorType: dto.sensorType.trim().toUpperCase(),
      value: dto.value,
      unit: dto.unit.trim(),
      sensorStatus: dto.sensorStatus?.trim().toUpperCase() || null,
      capturedAt: new Date(dto.capturedAt),
      receivedAt: new Date(),
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      metadata: dto.metadata ?? {},
    });

    try {
      const saved = await this.readings.save(entity);
      return { clientEventId: dto.clientEventId, status: 'ACCEPTED' as const, id: saved.id };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const duplicate = await this.readings.findOne({
          where: { deviceId: device.deviceId, clientEventId: dto.clientEventId },
        });
        return {
          clientEventId: dto.clientEventId,
          status: 'DUPLICATE' as const,
          id: duplicate?.id,
        };
      }
      throw error;
    }
  }

  private async resolveContext(device: AuthenticatedDevice, tripId?: string) {
    if (!tripId) return { driverId: device.driverId, vehicleId: device.vehicleId };

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
