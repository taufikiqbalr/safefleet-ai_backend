import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';

import { HealthResponse, HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic service health' })
  @ApiOkResponse({ description: 'Service is running' })
  health(): HealthResponse {
    return this.healthService.live();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Process is alive' })
  live(): HealthResponse {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe including database connectivity' })
  @ApiOkResponse({ description: 'Service and database are ready' })
  @ApiServiceUnavailableResponse({ description: 'A required dependency is unavailable' })
  async ready(): Promise<HealthResponse> {
    try {
      return await this.healthService.ready();
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'safefleet-ai-backend',
        database: 'down',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
