import { UserRole } from '../enums/domain.enums';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  email: string;
  role: UserRole;
}

export interface JwtAccessTokenPayload {
  sub: string;
  organizationId: string;
  email: string;
  role: UserRole;
}
