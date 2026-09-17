import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MaxLength(32)
  plateNumber!: string;

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
}
