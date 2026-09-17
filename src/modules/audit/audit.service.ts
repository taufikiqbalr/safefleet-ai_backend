import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { AuditLogEntity } from './audit-log.entity';
import { AuditQueryDto } from './dto/audit-query.dto';

export interface CreateAuditRecord {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogs: Repository<AuditLogEntity>,
  ) {}

  async record(input: CreateAuditRecord): Promise<AuditLogEntity> {
    return this.auditLogs.save(
      this.auditLogs.create({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata ?? null,
      }),
    );
  }

  async list(organizationId: string, query: AuditQueryDto) {
    const qb = this.auditLogs
      .createQueryBuilder('audit')
      .where('audit.organization_id = :organizationId', { organizationId });

    if (query.action?.trim()) {
      qb.andWhere('audit.action = :action', { action: query.action.trim() });
    }
    if (query.resourceType?.trim()) {
      qb.andWhere('audit.resource_type = :resourceType', {
        resourceType: query.resourceType.trim(),
      });
    }

    qb.orderBy('audit.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }
}
