import {
  IsBoolean,
  IsDateString,
  IsEnum,
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

import { SafetySeverity } from '../../../common/enums/domain.enums';

export class DrowsinessEventDto {
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

  @IsEnum(SafetySeverity)
  severity!: SafetySeverity;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sourceAlertLevel?: string;

  @IsOptional()
  @IsNumber()
  drowsinessScore?: number;

  @IsOptional()
  @IsBoolean()
  localAlarmTriggered?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  thresholdProfile?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  eyeAspectRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mouthAspectRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  perclosPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  blinkRatePerMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  eyeClosureDurationMs?: number;

  @IsOptional()
  @IsBoolean()
  yawning?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  yawnDurationMs?: number;

  @IsOptional()
  @IsNumber()
  headPitchDeg?: number;

  @IsOptional()
  @IsNumber()
  headYawDeg?: number;

  @IsOptional()
  @IsNumber()
  headRollDeg?: number;

  @IsOptional()
  @IsBoolean()
  faceDetected?: boolean;

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
