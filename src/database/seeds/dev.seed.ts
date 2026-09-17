import 'dotenv/config';

import * as bcrypt from 'bcryptjs';

import { UserRole, UserStatus, OrganizationStatus } from '../../common/enums/domain.enums';
import { OrganizationEntity } from '../../modules/organizations/organization.entity';
import { UserEntity } from '../../modules/users/user.entity';
import dataSource from '../data-source';

async function seed(): Promise<void> {
  if ((process.env.DEV_SEED_ENABLED ?? 'false').toLowerCase() !== 'true') {
    console.log('Development seed is disabled.');
    return;
  }

  await dataSource.initialize();

  try {
    const organizations = dataSource.getRepository(OrganizationEntity);
    const users = dataSource.getRepository(UserEntity);

    const slug = (process.env.DEV_ORGANIZATION_SLUG ?? 'safefleet-demo').trim().toLowerCase();
    let organization = await organizations.findOne({ where: { slug } });

    if (!organization) {
      organization = await organizations.save(
        organizations.create({
          name: process.env.DEV_ORGANIZATION_NAME ?? 'SafeFleet Demo',
          slug,
          status: OrganizationStatus.ACTIVE,
          timezone: 'Asia/Jakarta',
        }),
      );
      console.log(`Created development organization: ${organization.slug}`);
    }

    const email = (process.env.DEV_ADMIN_EMAIL ?? 'admin@safefleet.local').trim().toLowerCase();
    const existingUser = await users.findOne({
      where: { organizationId: organization.id, email },
    });

    if (!existingUser) {
      const password = process.env.DEV_ADMIN_PASSWORD ?? 'ChangeMe123!';
      await users.save(
        users.create({
          organizationId: organization.id,
          email,
          fullName: process.env.DEV_ADMIN_FULL_NAME ?? 'SafeFleet Administrator',
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
          passwordHash: await bcrypt.hash(password, 12),
        }),
      );
      console.log(`Created development owner: ${email}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
