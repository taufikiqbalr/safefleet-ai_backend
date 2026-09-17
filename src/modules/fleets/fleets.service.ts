import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { CreateFleetDto } from './dto/create-fleet.dto';
import { FleetQueryDto } from './dto/fleet-query.dto';
import { UpdateFleetDto } from './dto/update-fleet.dto';
import { FleetEntity } from './fleet.entity';

@Injectable()
export class FleetsService {
  constructor(
    @InjectRepository(FleetEntity)
    private readonly fleets: Repository<FleetEntity>,
  ) {}

  async list(organizationId: string, query: FleetQueryDto) {
    const qb = this.fleets
      .createQueryBuilder('fleet')
      .where('fleet.organization_id = :organizationId', { organizationId });

    if (query.status) qb.andWhere('fleet.status = :status', { status: query.status });
    if (query.search?.trim()) {
      qb.andWhere('(fleet.name ILIKE :search OR fleet.code ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    qb.orderBy('fleet.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getById(organizationId: string, id: string): Promise<FleetEntity> {
    const fleet = await this.fleets.findOne({ where: { id, organizationId } });
    if (!fleet) throw new NotFoundException('Fleet not found');
    return fleet;
  }

  async create(organizationId: string, dto: CreateFleetDto): Promise<FleetEntity> {
    const code = dto.code.trim().toUpperCase();
    const exists = await this.fleets.findOne({ where: { organizationId, code } });
    if (exists) throw new ConflictException('Fleet code already exists');

    return this.fleets.save(
      this.fleets.create({
        organizationId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      }),
    );
  }

  async update(organizationId: string, id: string, dto: UpdateFleetDto): Promise<FleetEntity> {
    const fleet = await this.getById(organizationId, id);

    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      const duplicate = await this.fleets
        .createQueryBuilder('fleet')
        .where('fleet.organization_id = :organizationId', { organizationId })
        .andWhere('fleet.code = :code', { code })
        .andWhere('fleet.id <> :id', { id })
        .getOne();
      if (duplicate) throw new ConflictException('Fleet code already exists');
      fleet.code = code;
    }

    if (dto.name !== undefined) fleet.name = dto.name.trim();
    if (dto.description !== undefined) fleet.description = dto.description.trim() || null;
    if (dto.status !== undefined) fleet.status = dto.status;
    return this.fleets.save(fleet);
  }

  async remove(organizationId: string, id: string): Promise<{ deleted: true }> {
    await this.getById(organizationId, id);
    await this.fleets.softDelete({ id, organizationId });
    return { deleted: true };
  }
}
