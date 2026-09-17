import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import {
  AuthenticatedUser,
  JwtAccessTokenPayload,
} from '../../common/auth/authenticated-user.interface';
import { UserRole } from '../../common/enums/domain.enums';

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      this.assertAllowedOrigin(client);
      const token = this.extractToken(client);
      if (!token) throw new Error('Missing access token');

      const payload = await this.jwtService.verifyAsync<JwtAccessTokenPayload>(token);
      if (
        !payload.sub ||
        !payload.organizationId ||
        !payload.email ||
        !Object.values(UserRole).includes(payload.role)
      ) {
        throw new Error('Invalid access token claims');
      }

      const user: AuthenticatedUser = {
        userId: payload.sub,
        organizationId: payload.organizationId,
        email: payload.email,
        role: payload.role,
      };

      client.data.user = user;
      await client.join(this.organizationRoom(user.organizationId));
      client.emit('session.ready', {
        organizationId: user.organizationId,
        userId: user.userId,
      });
    } catch {
      client.disconnect(true);
    }
  }

  emitOrganization(organizationId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(this.organizationRoom(organizationId)).emit(event, payload);
  }

  private organizationRoom(organizationId: string): string {
    return `organization:${organizationId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) return authToken;

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization !== 'string') return undefined;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' && token ? token : undefined;
  }

  private assertAllowedOrigin(client: Socket): void {
    const origin = client.handshake.headers.origin;
    if (!origin) return;

    const allowedOrigins = this.config
      .get<string>('CORS_ORIGINS', '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      throw new Error('Origin is not allowed');
    }
  }
}
