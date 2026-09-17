import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, mergeMap } from 'rxjs';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user || ['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return next.handle();
    }

    const currentUser = request.user;

    return next.handle().pipe(
      mergeMap(async (data: unknown) => {
        try {
          await this.auditService.record({
            organizationId: currentUser.organizationId,
            actorUserId: currentUser.userId,
            action: `${request.method} ${request.route?.path ?? request.path}`,
            resourceType: this.resourceType(request),
            resourceId: this.resourceId(request, data),
            metadata: {
              path: request.originalUrl,
              method: request.method,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown audit error';
          this.logger.error(`Failed to persist audit record: ${message}`);
        }
        return data;
      }),
    );
  }

  private resourceType(request: Request): string {
    const segments = request.path.split('/').filter(Boolean);
    return segments[0] ?? 'unknown';
  }

  private resourceId(request: Request, data: unknown): string | null {
    const parameterId = request.params?.id;
    if (typeof parameterId === 'string' && this.isUuid(parameterId)) return parameterId;

    if (typeof data === 'object' && data !== null && 'id' in data) {
      const id = (data as { id?: unknown }).id;
      if (typeof id === 'string' && this.isUuid(id)) return id;
    }
    return null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
