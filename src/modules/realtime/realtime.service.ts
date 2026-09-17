import { Injectable } from '@nestjs/common';

import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  publishOrganization(organizationId: string, event: string, payload: unknown): void {
    this.gateway.emitOrganization(organizationId, event, payload);
  }
}
