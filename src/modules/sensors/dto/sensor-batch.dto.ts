import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { SensorReadingDto } from './sensor-reading.dto';

export class SensorBatchDto {
  @IsOptional()
  @IsUUID()
  syncBatchId?: string;

  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SensorReadingDto)
  readings!: SensorReadingDto[];
}
