import 'dotenv/config';

import { DataSource } from 'typeorm';

const databaseSsl = process.env.DATABASE_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 6543),
  username: process.env.DATABASE_USER ?? 'safefleet',
  password: process.env.DATABASE_PASSWORD ?? 'safefleet_dev',
  database: process.env.DATABASE_NAME ?? 'safefleet',
  ssl: databaseSsl ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
  entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
});
