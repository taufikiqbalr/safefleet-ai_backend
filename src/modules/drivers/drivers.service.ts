import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { DriverQueryDto } from './dto/driver-query.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverEntity } from './driver.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(DriverEntity)
    private readonly drivers: Repository<DriverEntity>,
  ) {}

  async list(organizationId: string, query: DriverQueryDto) {
    const qb = this.drivers
      .createQueryBuilder('driver')
      .where('driver.organization_id = :organizationId', { organizationId });

    if (query.status) qb.andWhere('driver.status = :status', { status: query.status });
    if (query.search?.trim()) {
      qb.andWhere('(driver.full_name ILIKE :search OR driver.employee_code ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    qb.orderBy('driver.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getById(organizationId: string, id: string): Promise<DriverEntity> {
    const driver = await this.drivers.findOne({ where: { id, organizationId } });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async create(organizationId: string, dto: CreateDriverDto): Promise<DriverEntity> {
    const employeeCode = dto.employeeCode.trim().toUpperCase();
    const exists = await this.drivers.findOne({ where: { organizationId, employeeCode } });
    if (exists) throw new ConflictException('Driver employee code already exists');

    return this.drivers.save(
      this.drivers.create({
        organizationId,
        employeeCode,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
      }),
    );
  }

  async update(organizationId: string, id: string, dto: UpdateDriverDto): Promise<DriverEntity> {
    const driver = await this.getById(organizationId, id);
    if (dto.employeeCode !== undefined) {
      const employeeCode = dto.employeeCode.trim().toUpperCase();
      const duplicate = await this.drivers
        .createQueryBuilder('driver')
        .where('driver.organization_id = :organizationId', { organizationId })
        .andWhere('driver.employee_code = :employeeCode', { employeeCode })
        .andWhere('driver.id <> :id', { id })
        .getOne();
      if (duplicate) throw new ConflictException('Driver employee code already exists');
      driver.employeeCode = employeeCode;
    }
    if (dto.fullName !== undefined) driver.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) driver.phone = dto.phone.trim() || null;
    if (dto.status !== undefined) driver.status = dto.status;
    return this.drivers.save(driver);
  }

  async remove(organizationId: string, id: string): Promise<{ deleted: true }> {
    await this.getById(organizationId, id);
    await this.drivers.softDelete({ id, organizationId });
    return { deleted: true };
  }
}
