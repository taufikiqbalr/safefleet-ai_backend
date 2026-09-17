import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

import { VehicleStatus } from '../../../common/enums/domain.enums';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  plateNumber?: string;

  @IsOptional()
  @IsUUID()
  fleetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  externalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  make?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}
