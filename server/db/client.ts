import postgres, { type Sql, type TransactionSql } from 'postgres';
import { getEnv } from '../runtime/env';

export type DatabaseClient = Sql<Record<string, never>>;
export type DatabaseTransaction = TransactionSql<Record<string, never>>;

export function databaseUrlFromEnv(): string | null {
  return [
    getEnv('HOC_VUI_DATABASE_URL'),
    getEnv('DATABASE_URL'),
    getEnv('DB_URL'),
    getEnv('SUPABASE_DB_URL'),
  ].find((value): value is string => Boolean(value?.trim())) ?? null;
}

export function createDbClient(url = databaseUrlFromEnv()): DatabaseClient {
  if (!url) throw new Error('HOC_VUI_DATABASE_URL or DATABASE_URL is required for the server database.');
  const sslRequired = getEnv('PGSSLMODE') === 'require' || /(?:^|[?&])sslmode=require(?:&|$)/.test(url);
  return postgres(url, {
    max: Number(getEnv('HOC_VUI_DB_POOL_MAX') ?? 1),
    prepare: false,
    ssl: sslRequired ? 'require' : false,
    connect_timeout: 5,
    idle_timeout: 20,
  }) as DatabaseClient;
}

export async function withTransaction<T>(db: DatabaseClient, work: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
  return db.begin((tx) => work(tx as DatabaseTransaction)) as Promise<T>;
}

export async function pingDatabase(db: DatabaseClient): Promise<boolean> {
  const rows = await db`select 1 as ok`;
  return rows.length === 1 && Number((rows[0] as { ok: number }).ok) === 1;
}
