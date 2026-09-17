import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MaxLength(160)
  deviceUid!: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  modelVersion?: string;
}
