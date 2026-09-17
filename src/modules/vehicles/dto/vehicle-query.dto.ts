import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VehicleStatus } from '../../../common/enums/domain.enums';

export class VehicleQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsUUID()
  fleetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
