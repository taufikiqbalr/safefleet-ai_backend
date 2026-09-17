import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { DrowsinessEventDto } from './drowsiness-event.dto';

export class DrowsinessBatchDto {
  @IsOptional()
  @IsUUID()
  syncBatchId?: string;

  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DrowsinessEventDto)
  events!: DrowsinessEventDto[];
}
