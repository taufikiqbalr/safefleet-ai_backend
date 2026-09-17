import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class LiveFleetQueryDto {
  @IsOptional()
  @IsUUID()
  fleetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3600)
  staleAfterSeconds = 120;
}

export class DashboardAlertsQueryDto {
  @IsOptional()
  @IsUUID()
  fleetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
