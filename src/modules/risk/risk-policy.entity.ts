import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { RiskPolicyStatus } from '../../common/enums/domain.enums';
import { OrganizationEntity } from '../organizations/organization.entity';

export interface RiskPolicyConfig {
  mode: 'SOURCE_SEVERITY';
  severityMap: Record<string, string>;
  alertAtOrAbove: string;
  scoreByLevel?: Record<string, number>;
  repeatWindowSeconds?: number;
  repeatEscalation?: Array<{ minEvents: number; level: string }>;
}

@Entity({ name: 'risk_policies' })
@Index('idx_risk_policies_organization_id', ['organizationId'])
export class RiskPolicyEntity extends AppBaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'integer' })
  version!: number;

  @Column({ type: 'varchar', length: 24, default: RiskPolicyStatus.DRAFT })
  status!: RiskPolicyStatus;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config!: RiskPolicyConfig;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt!: Date | null;
}
