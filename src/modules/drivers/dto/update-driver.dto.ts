import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { DriverStatus } from '../../../common/enums/domain.enums';

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  employeeCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}
