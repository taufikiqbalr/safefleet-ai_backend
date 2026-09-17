import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { AlertStatus, RiskLevel } from '../../common/enums/domain.enums';

@Entity({ name: 'alerts' })
@Index('idx_alerts_org_created_at', ['organizationId', 'createdAt'])
export class AlertEntity {
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

  @Column({ name: 'safety_event_id', type: 'uuid', nullable: true })
  safetyEventId!: string | null;

  @Column({ name: 'risk_snapshot_id', type: 'uuid', nullable: true })
  riskSnapshotId!: string | null;

  @Column({ name: 'alert_type', type: 'varchar', length: 48 })
  alertType!: string;

  @Column({ type: 'varchar', length: 24 })
  severity!: RiskLevel;

  @Column({ type: 'varchar', length: 24, default: AlertStatus.OPEN })
  status!: AlertStatus;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 240 })
  dedupeKey!: string;

  @Column({ name: 'occurrence_count', type: 'integer', default: 1 })
  occurrenceCount!: number;

  @Column({ name: 'first_event_at', type: 'timestamptz' })
  firstEventAt!: Date;

  @Column({ name: 'last_event_at', type: 'timestamptz' })
  lastEventAt!: Date;

  @Column({ name: 'acknowledged_by_user_id', type: 'uuid', nullable: true })
  acknowledgedByUserId!: string | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
