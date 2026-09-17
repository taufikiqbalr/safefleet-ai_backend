import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { UserRole, UserStatus } from '../../common/enums/domain.enums';
import { OrganizationEntity } from '../organizations/organization.entity';

@Entity({ name: 'users' })
@Index('idx_users_organization_id', ['organizationId'])
@Index('uq_users_organization_email', ['organizationId', 'email'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class UserEntity extends AppBaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 160 })
  fullName!: string;

  @Column({ type: 'varchar', length: 32, default: UserRole.VIEWER })
  role!: UserRole;

  @Column({ type: 'varchar', length: 32, default: UserStatus.INVITED })
  status!: UserStatus;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash!: string | null;
}
