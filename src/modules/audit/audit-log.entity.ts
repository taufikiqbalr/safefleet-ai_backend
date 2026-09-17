import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'audit_logs' })
@Index('idx_audit_logs_organization_created_at', ['organizationId', 'createdAt'])
@Index('idx_audit_logs_actor_user_id', ['actorUserId'])
@Index('idx_audit_logs_resource', ['resourceType', 'resourceId'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 160 })
  action!: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 80 })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
