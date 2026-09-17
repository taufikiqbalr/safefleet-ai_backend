import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DriverStatus } from '../../../common/enums/domain.enums';

export class DriverQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
