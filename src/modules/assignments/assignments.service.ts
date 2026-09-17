import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { AssignmentStatus, DeviceStatus, DriverStatus, VehicleStatus } from '../../common/enums/domain.enums';
import { DeviceEntity } from '../devices/device.entity';
import { DriverEntity } from '../drivers/driver.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';
import { AssignmentEntity } from './assignment.entity';
import { AssignmentQueryDto } from './dto/assignment-query.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(AssignmentEntity)
    private readonly assignments: Repository<AssignmentEntity>,
    @InjectRepository(DriverEntity)
    private readonly drivers: Repository<DriverEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(DeviceEntity)
    private readonly devices: Repository<DeviceEntity>,
  ) {}

  async list(organizationId: string, query: AssignmentQueryDto) {
    const qb = this.assignments
      .createQueryBuilder('assignment')
      .where('assignment.organization_id = :organizationId', { organizationId });
    if (query.status) qb.andWhere('assignment.status = :status', { status: query.status });
    if (query.driverId) qb.andWhere('assignment.driver_id = :driverId', { driverId: query.driverId });
    if (query.vehicleId) qb.andWhere('assignment.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    qb.orderBy('assignment.started_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getById(organizationId: string, id: string): Promise<AssignmentEntity> {
    const assignment = await this.assignments.findOne({ where: { id, organizationId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async create(organizationId: string, dto: CreateAssignmentDto): Promise<AssignmentEntity> {
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

    const conflict = await this.assignments.findOne({
      where: [
        { organizationId, driverId: dto.driverId, status: AssignmentStatus.ACTIVE },
        { organizationId, vehicleId: dto.vehicleId, status: AssignmentStatus.ACTIVE },
      ],
    });
    if (conflict) throw new ConflictException('Driver or vehicle already has an active assignment');

    return this.assignments.save(
      this.assignments.create({
        organizationId,
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        deviceId: dto.deviceId ?? null,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        endedAt: null,
        status: AssignmentStatus.ACTIVE,
      }),
    );
  }

  async end(organizationId: string, id: string): Promise<AssignmentEntity> {
    const assignment = await this.getById(organizationId, id);
    if (assignment.status !== AssignmentStatus.ACTIVE) {
      throw new ConflictException('Only an active assignment can be ended');
    }
    assignment.status = AssignmentStatus.ENDED;
    assignment.endedAt = new Date();
    return this.assignments.save(assignment);
  }
}
