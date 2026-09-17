import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { RiskPolicyStatus } from '../../../common/enums/domain.enums';

export class RiskPolicyQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RiskPolicyStatus)
  status?: RiskPolicyStatus;
}
