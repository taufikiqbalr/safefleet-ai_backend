import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { AlertStatus } from '../../common/enums/domain.enums';

@Entity({ name: 'alert_status_history' })
@Index('idx_alert_history_alert_id', ['alertId', 'createdAt'])
export class AlertStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'alert_id', type: 'uuid' })
  alertId!: string;

  @Column({ name: 'from_status', type: 'varchar', length: 24, nullable: true })
  fromStatus!: AlertStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 24 })
  toStatus!: AlertStatus;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
