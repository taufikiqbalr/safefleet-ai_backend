import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { RiskLevel } from '../../common/enums/domain.enums';

@Entity({ name: 'risk_snapshots' })
@Index('idx_risk_snapshots_org_calculated_at', ['organizationId', 'calculatedAt'])
export class RiskSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId!: string | null;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @Column({ name: 'safety_event_id', type: 'uuid' })
  safetyEventId!: string;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'policy_version', type: 'integer' })
  policyVersion!: number;

  @Column({ name: 'risk_level', type: 'varchar', length: 24 })
  riskLevel!: RiskLevel;

  @Column({ type: 'real', nullable: true })
  score!: number | null;

  @Column({ name: 'contributing_factors', type: 'jsonb', default: () => "'{}'::jsonb" })
  contributingFactors!: Record<string, unknown>;

  @Column({ name: 'calculated_at', type: 'timestamptz', default: () => 'now()' })
  calculatedAt!: Date;
}
