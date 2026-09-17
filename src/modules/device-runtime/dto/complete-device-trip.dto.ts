import { IsDateString, IsOptional } from 'class-validator';

export class CompleteDeviceTripDto {
  @IsOptional()
  @IsDateString()
  endedAt?: string;
}
