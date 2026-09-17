import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class StartTripDto {
  @IsUUID()
  driverId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  fleetId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsOptional()
  @IsUUID()
  clientTripId?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;
}
