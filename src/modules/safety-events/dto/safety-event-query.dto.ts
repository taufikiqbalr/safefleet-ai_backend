import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SafetyEventType, SafetySeverity } from '../../../common/enums/domain.enums';

export class SafetyEventQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SafetyEventType)
  eventType?: SafetyEventType;

  @IsOptional()
  @IsEnum(SafetySeverity)
  severity?: SafetySeverity;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
