import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { UserRole } from '../enums/domain.enums';
import { AuthenticatedUser, JwtAccessTokenPayload } from './authenticated-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Bearer access token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessTokenPayload>(token);
      if (
        !payload.sub ||
        !payload.organizationId ||
        !payload.email ||
        !Object.values(UserRole).includes(payload.role)
      ) {
        throw new UnauthorizedException('Invalid access token claims');
      }

      request.user = {
        userId: payload.sub,
        organizationId: payload.organizationId,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : undefined;
  }
}
