import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { FleetEntity } from '../fleets/fleet.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { VehicleEntity } from './vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(FleetEntity)
    private readonly fleets: Repository<FleetEntity>,
  ) {}

  async list(organizationId: string, query: VehicleQueryDto) {
    const qb = this.vehicles
      .createQueryBuilder('vehicle')
      .where('vehicle.organization_id = :organizationId', { organizationId });
    if (query.status) qb.andWhere('vehicle.status = :status', { status: query.status });
    if (query.fleetId) qb.andWhere('vehicle.fleet_id = :fleetId', { fleetId: query.fleetId });
    if (query.search?.trim()) {
      qb.andWhere('(vehicle.plate_number ILIKE :search OR vehicle.external_code ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }
    qb.orderBy('vehicle.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getById(organizationId: string, id: string): Promise<VehicleEntity> {
    const vehicle = await this.vehicles.findOne({ where: { id, organizationId }, relations: { fleet: true } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async create(organizationId: string, dto: CreateVehicleDto): Promise<VehicleEntity> {
    const plateNumber = dto.plateNumber.trim().toUpperCase();
    const exists = await this.vehicles.findOne({ where: { organizationId, plateNumber } });
    if (exists) throw new ConflictException('Vehicle plate number already exists');
    if (dto.fleetId) await this.assertFleet(organizationId, dto.fleetId);

    return this.vehicles.save(
      this.vehicles.create({
        organizationId,
        plateNumber,
        fleetId: dto.fleetId ?? null,
        externalCode: dto.externalCode?.trim() || null,
        make: dto.make?.trim() || null,
        model: dto.model?.trim() || null,
        year: dto.year ?? null,
      }),
    );
  }

  async update(organizationId: string, id: string, dto: UpdateVehicleDto): Promise<VehicleEntity> {
    const vehicle = await this.getById(organizationId, id);
    if (dto.plateNumber !== undefined) {
      const plateNumber = dto.plateNumber.trim().toUpperCase();
      const duplicate = await this.vehicles
        .createQueryBuilder('vehicle')
        .where('vehicle.organization_id = :organizationId', { organizationId })
        .andWhere('vehicle.plate_number = :plateNumber', { plateNumber })
        .andWhere('vehicle.id <> :id', { id })
        .getOne();
      if (duplicate) throw new ConflictException('Vehicle plate number already exists');
      vehicle.plateNumber = plateNumber;
    }
    if (dto.fleetId !== undefined) {
      await this.assertFleet(organizationId, dto.fleetId);
      vehicle.fleetId = dto.fleetId;
    }
    if (dto.externalCode !== undefined) vehicle.externalCode = dto.externalCode.trim() || null;
    if (dto.make !== undefined) vehicle.make = dto.make.trim() || null;
    if (dto.model !== undefined) vehicle.model = dto.model.trim() || null;
    if (dto.year !== undefined) vehicle.year = dto.year;
    if (dto.status !== undefined) vehicle.status = dto.status;
    return this.vehicles.save(vehicle);
  }

  async remove(organizationId: string, id: string): Promise<{ deleted: true }> {
    await this.getById(organizationId, id);
    await this.vehicles.softDelete({ id, organizationId });
    return { deleted: true };
  }

  private async assertFleet(organizationId: string, fleetId: string): Promise<void> {
    const fleet = await this.fleets.findOne({ where: { id: fleetId, organizationId } });
    if (!fleet) throw new NotFoundException('Fleet not found in this organization');
  }
}
