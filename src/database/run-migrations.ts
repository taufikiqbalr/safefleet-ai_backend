import dataSource from './data-source';

async function runMigrations(): Promise<void> {
  await dataSource.initialize();

  try {
    const migrations = await dataSource.runMigrations({ transaction: 'all' });
    const names = migrations.map((migration) => migration.name);
    console.log(`Applied ${migrations.length} migration(s)`, names);
  } finally {
    await dataSource.destroy();
  }
}

void runMigrations().catch((error: unknown) => {
  console.error('Migration failed', error);
  process.exitCode = 1;
});
