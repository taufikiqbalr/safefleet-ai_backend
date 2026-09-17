import { SetMetadata } from '@nestjs/common';

import { UserRole } from '../enums/domain.enums';

export const ROLES_KEY = 'safefleet.roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
