import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { TelemetryPointDto } from './telemetry-point.dto';

export class TelemetryBatchDto {
  @IsOptional()
  @IsUUID()
  syncBatchId?: string;

  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TelemetryPointDto)
  points!: TelemetryPointDto[];
}
