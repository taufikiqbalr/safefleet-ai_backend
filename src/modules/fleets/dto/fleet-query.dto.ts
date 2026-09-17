import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FleetStatus } from '../../../common/enums/domain.enums';

export class FleetQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FleetStatus)
  status?: FleetStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
