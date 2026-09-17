import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { SafetyEventFeedbackClassification } from '../../common/enums/domain.enums';

@Entity({ name: 'safety_event_feedback' })
@Index('idx_feedback_event_id', ['safetyEventId', 'createdAt'])
export class SafetyEventFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'safety_event_id', type: 'uuid' })
  safetyEventId!: string;

  @Column({ name: 'reviewer_user_id', type: 'uuid' })
  reviewerUserId!: string;

  @Column({ type: 'varchar', length: 24 })
  classification!: SafetyEventFeedbackClassification;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
