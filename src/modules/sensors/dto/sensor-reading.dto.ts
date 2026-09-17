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

export class SensorReadingDto {
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

  @IsString()
  @MaxLength(120)
  sensorId!: string;

  @IsString()
  @MaxLength(64)
  sensorType!: string;

  @IsNumber()
  value!: number;

  @IsString()
  @MaxLength(32)
  unit!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sensorStatus?: string;

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
  @IsObject()
  metadata?: Record<string, unknown>;
}
