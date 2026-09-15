import postgres, { type Sql, type TransactionSql } from 'postgres';

export type DatabaseClient = Sql<Record<string, never>>;
export type DatabaseTransaction = TransactionSql<Record<string, never>>;

export function databaseUrlFromEnv(): string | null {
  return process.env.HOC_VUI_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.DB_URL ?? null;
}

export function createDbClient(url = databaseUrlFromEnv()): DatabaseClient {
  if (!url) throw new Error('HOC_VUI_DATABASE_URL or DATABASE_URL is required for the server database.');
  const sslRequired = process.env.PGSSLMODE === 'require' || /(?:^|[?&])sslmode=require(?:&|$)/.test(url);
  return postgres(url, {
    max: Number(process.env.HOC_VUI_DB_POOL_MAX ?? 1),
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
