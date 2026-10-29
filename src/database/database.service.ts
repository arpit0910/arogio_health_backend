import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: config.getOrThrow<number>('DATABASE_POOL_MAX'),
      idleTimeoutMillis: config.getOrThrow<number>('DATABASE_IDLE_TIMEOUT_MS'),
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: config.get<string>('NODE_ENV') === 'test',
    });
    this.db = drizzle(this.pool, { schema });
  }

  async ping(): Promise<void> {
    await this.pool.query('select 1');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
