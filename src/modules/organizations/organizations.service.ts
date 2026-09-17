import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrganizationEntity } from './organization.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizations: Repository<OrganizationEntity>,
  ) {}

  async getCurrent(organizationId: string): Promise<OrganizationEntity> {
    const organization = await this.organizations.findOne({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async updateCurrent(
    organizationId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationEntity> {
    const organization = await this.getCurrent(organizationId);
    if (dto.name !== undefined) organization.name = dto.name.trim();
    if (dto.timezone !== undefined) organization.timezone = dto.timezone.trim();
    return this.organizations.save(organization);
  }
}
