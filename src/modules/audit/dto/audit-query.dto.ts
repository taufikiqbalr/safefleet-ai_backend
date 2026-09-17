import { IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceType?: string;
}
