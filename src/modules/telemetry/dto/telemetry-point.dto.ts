import {
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class TelemetryPointDto {
  @IsUUID()
  clientEventId!: string;

  @IsDateString()
  capturedAt!: string;

  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sequenceNumber?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  speedKph?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryPercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  networkType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  modelVersion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  inferenceLatencyMs?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
