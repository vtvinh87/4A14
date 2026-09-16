import { afterAll, describe, expect, it } from 'vitest';
import { createDbClient } from './client';

const databaseUrl = process.env.HOC_VUI_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.DB_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const sql = databaseUrl ? createDbClient(databaseUrl) : null;

describeDatabase('local Supabase database', () => {
  afterAll(async () => {
    await sql?.end({ timeout: 5 });
  });

  it('exposes the private application schema only to the direct runtime role', async () => {
    const rows = await sql!<{ schema_name: string; table_name: string }[]>`
      select table_schema as schema_name, table_name
      from information_schema.tables
      where table_schema = 'hoc_vui_private'
      order by table_name
    `;
    expect(rows.map((row) => row.table_name)).toEqual([
      'admin_audits',
      'auth_sessions',
      'accounts',
      'classroom_messages',
      'classroom_presence',
      'credentials',
      'learning_events',
      'learning_runs',
      'migration_receipts',
      'progress_snapshots',
    ].sort());

    const exposed = await sql!<{ schema_name: string }[]>`
      select schema_name
      from information_schema.schemata
      where schema_name = 'hoc_vui_private'
    `;
    expect(exposed).toHaveLength(1);
  });
});
