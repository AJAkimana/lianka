import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';

config();

const cs = new ConfigService();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: cs.get('DB_HOST'),
  port: cs.get<number>('DB_PORT'),
  username: cs.get('DB_USER'),
  password: cs.get('DB_PASS'),
  database: cs.get('DB_NAME'),
  synchronize: false, // NEVER true in production — schema.sql handles this
  ssl:
    cs.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
  logging: cs.get('NODE_ENV') !== 'production',
  entities: [__dirname + '**/*.entity.{ts,js}'],
  migrations: ['dist/db/migrations/*.js'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
  extra: {
    connectionLimit: 10, // Adjust based on your database connection pool requirements
  },
};

const dataSource = new DataSource(dataSourceOptions);

// You might want to do
// dataSource.initialize()
// but I found mine working regardless of it

export default dataSource;
