import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { FleetStatus } from '../../../common/enums/domain.enums';

export class UpdateFleetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(FleetStatus)
  status?: FleetStatus;
}
