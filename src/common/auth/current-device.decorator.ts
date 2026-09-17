import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { AuthenticatedDevice } from './authenticated-device.interface';

export const CurrentDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedDevice => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { device: AuthenticatedDevice }>();
    return request.device;
  },
);
