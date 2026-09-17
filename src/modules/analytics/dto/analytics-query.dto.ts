import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class AnalyticsRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export enum AnalyticsBucket {
  HOUR = 'hour',
  DAY = 'day',
}

export class AnalyticsTrendQueryDto extends AnalyticsRangeQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsBucket)
  bucket: AnalyticsBucket = AnalyticsBucket.DAY;
}
