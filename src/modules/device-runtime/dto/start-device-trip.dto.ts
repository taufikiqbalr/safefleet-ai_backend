import { IsDateString, IsUUID, IsOptional } from 'class-validator';

export class StartDeviceTripDto {
  @IsUUID()
  clientTripId!: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;
}
