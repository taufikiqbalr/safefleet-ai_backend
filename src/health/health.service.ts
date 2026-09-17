import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  database?: 'up';
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  live(): HealthResponse {
    return {
      status: 'ok',
      service: 'safefleet-ai-backend',
      version: this.config.get<string>('APP_VERSION', '0.1.0'),
      timestamp: new Date().toISOString(),
    };
  }

  async ready(): Promise<HealthResponse> {
    await this.dataSource.query('SELECT 1');
    return {
      ...this.live(),
      database: 'up',
    };
  }
}
