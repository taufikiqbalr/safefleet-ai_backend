import { Column, Entity, Index } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { OrganizationStatus } from '../../common/enums/domain.enums';

@Entity({ name: 'organizations' })
@Index('uq_organizations_slug', ['slug'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class OrganizationEntity extends AppBaseEntity {
  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 80 })
  slug!: string;

  @Column({ type: 'varchar', length: 32, default: OrganizationStatus.ACTIVE })
  status!: OrganizationStatus;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone!: string;
}
