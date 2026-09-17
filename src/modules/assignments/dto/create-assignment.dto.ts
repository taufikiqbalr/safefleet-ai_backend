import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  driverId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;
}
