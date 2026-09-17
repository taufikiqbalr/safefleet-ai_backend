import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { VehicleStatus } from '../../common/enums/domain.enums';
import { FleetEntity } from '../fleets/fleet.entity';
import { OrganizationEntity } from '../organizations/organization.entity';

@Entity({ name: 'vehicles' })
@Index('idx_vehicles_organization_id', ['organizationId'])
@Index('idx_vehicles_fleet_id', ['fleetId'])
@Index('uq_vehicles_organization_plate', ['organizationId', 'plateNumber'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class VehicleEntity extends AppBaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ name: 'fleet_id', type: 'uuid', nullable: true })
  fleetId!: string | null;

  @ManyToOne(() => FleetEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fleet_id' })
  fleet!: FleetEntity | null;

  @Column({ name: 'plate_number', type: 'varchar', length: 32 })
  plateNumber!: string;

  @Column({ name: 'external_code', type: 'varchar', length: 80, nullable: true })
  externalCode!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  make!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  model!: string | null;

  @Column({ type: 'smallint', nullable: true })
  year!: number | null;

  @Column({ type: 'varchar', length: 32, default: VehicleStatus.ACTIVE })
  status!: VehicleStatus;
}
