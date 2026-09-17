import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { AssignmentStatus, DeviceStatus, DriverStatus, TripStatus, VehicleStatus } from '../../common/enums/domain.enums';
import { AssignmentEntity } from '../assignments/assignment.entity';
import { DeviceEntity } from '../devices/device.entity';
import { DriverEntity } from '../drivers/driver.entity';
import { FleetEntity } from '../fleets/fleet.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';
import { StartTripDto } from './dto/start-trip.dto';
import { TripQueryDto } from './dto/trip-query.dto';
import { TripEntity } from './trip.entity';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly trips: Repository<TripEntity>,
    @InjectRepository(DriverEntity)
    private readonly drivers: Repository<DriverEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(DeviceEntity)
    private readonly devices: Repository<DeviceEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignments: Repository<AssignmentEntity>,
    @InjectRepository(FleetEntity)
    private readonly fleets: Repository<FleetEntity>,
  ) {}

  async list(organizationId: string, query: TripQueryDto) {
    const qb = this.trips
      .createQueryBuilder('trip')
      .where('trip.organization_id = :organizationId', { organizationId });
    if (query.status) qb.andWhere('trip.status = :status', { status: query.status });
    if (query.driverId) qb.andWhere('trip.driver_id = :driverId', { driverId: query.driverId });
    if (query.vehicleId) qb.andWhere('trip.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    if (query.fleetId) qb.andWhere('trip.fleet_id = :fleetId', { fleetId: query.fleetId });
    qb.orderBy('trip.started_at', 'DESC', 'NULLS LAST')
      .addOrderBy('trip.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getById(organizationId: string, id: string): Promise<TripEntity> {
    const trip = await this.trips.findOne({ where: { id, organizationId } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async start(organizationId: string, dto: StartTripDto): Promise<TripEntity> {
    if (dto.clientTripId) {
      const existing = await this.trips.findOne({
        where: { organizationId, clientTripId: dto.clientTripId },
      });
      if (existing) return existing;
    }

    const driver = await this.drivers.findOne({ where: { id: dto.driverId, organizationId } });
    if (!driver || driver.status !== DriverStatus.ACTIVE) {
      throw new NotFoundException('Active driver not found in this organization');
    }
    const vehicle = await this.vehicles.findOne({ where: { id: dto.vehicleId, organizationId } });
    if (!vehicle || vehicle.status !== VehicleStatus.ACTIVE) {
      throw new NotFoundException('Active vehicle not found in this organization');
    }
    if (dto.deviceId) {
      const device = await this.devices.findOne({ where: { id: dto.deviceId, organizationId } });
      if (!device || device.status !== DeviceStatus.ACTIVE) {
        throw new NotFoundException('Active device not found in this organization');
      }
    }
    if (dto.fleetId) {
      const fleet = await this.fleets.findOne({ where: { id: dto.fleetId, organizationId } });
      if (!fleet) throw new NotFoundException('Fleet not found in this organization');
    }
    if (dto.assignmentId) {
      const assignment = await this.assignments.findOne({
        where: { id: dto.assignmentId, organizationId },
      });
      if (
        !assignment ||
        assignment.status !== AssignmentStatus.ACTIVE ||
        assignment.driverId !== dto.driverId ||
        assignment.vehicleId !== dto.vehicleId
      ) {
        throw new ConflictException('Assignment is not active or does not match driver and vehicle');
      }
    }

    const active = await this.trips.findOne({
      where: [
        { organizationId, driverId: dto.driverId, status: TripStatus.ACTIVE },
        { organizationId, vehicleId: dto.vehicleId, status: TripStatus.ACTIVE },
      ],
    });
    if (active) throw new ConflictException('Driver or vehicle already has an active trip');

    return this.trips.save(
      this.trips.create({
        organizationId,
        fleetId: dto.fleetId ?? vehicle.fleetId,
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        deviceId: dto.deviceId ?? null,
        assignmentId: dto.assignmentId ?? null,
        clientTripId: dto.clientTripId ?? null,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        endedAt: null,
        status: TripStatus.ACTIVE,
      }),
    );
  }

  async complete(organizationId: string, id: string): Promise<TripEntity> {
    return this.finish(organizationId, id, TripStatus.COMPLETED);
  }

  async cancel(organizationId: string, id: string): Promise<TripEntity> {
    return this.finish(organizationId, id, TripStatus.CANCELLED);
  }

  private async finish(
    organizationId: string,
    id: string,
    status: TripStatus.COMPLETED | TripStatus.CANCELLED,
  ): Promise<TripEntity> {
    const trip = await this.getById(organizationId, id);
    if (trip.status !== TripStatus.ACTIVE) {
      throw new ConflictException('Only an active trip can be completed or cancelled');
    }
    trip.status = status;
    trip.endedAt = new Date();
    return this.trips.save(trip);
  }
}
