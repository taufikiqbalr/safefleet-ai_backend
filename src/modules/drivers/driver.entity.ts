import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { DriverStatus } from '../../common/enums/domain.enums';
import { OrganizationEntity } from '../organizations/organization.entity';

@Entity({ name: 'drivers' })
@Index('idx_drivers_organization_id', ['organizationId'])
@Index('uq_drivers_organization_employee_code', ['organizationId', 'employeeCode'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class DriverEntity extends AppBaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ name: 'employee_code', type: 'varchar', length: 80 })
  employeeCode!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 160 })
  fullName!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 32, default: DriverStatus.ACTIVE })
  status!: DriverStatus;
}
