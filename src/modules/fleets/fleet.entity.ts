import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { FleetStatus } from '../../common/enums/domain.enums';
import { OrganizationEntity } from '../organizations/organization.entity';

@Entity({ name: 'fleets' })
@Index('idx_fleets_organization_id', ['organizationId'])
@Index('uq_fleets_organization_code', ['organizationId', 'code'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class FleetEntity extends AppBaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ type: 'varchar', length: 80 })
  code!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, default: FleetStatus.ACTIVE })
  status!: FleetStatus;
}
