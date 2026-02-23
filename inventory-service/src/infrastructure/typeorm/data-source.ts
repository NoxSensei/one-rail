// ensures .env is loaded when used via TypeORM CLI (outside NestJS)
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

// Connection-only options shared with the NestJS module (no globs — those are CLI-only)
export const connectionOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.MYSQL_HOST ?? 'localhost',
  port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
  username: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DATABASE ?? 'inventory',
  synchronize: false,
};

// Full DataSource used by the TypeORM CLI for migrations
const InventoryDataSource = new DataSource({
  ...connectionOptions,
  entities: ['src/**/*.entity.ts'],
  migrations: ['migrations/*.ts'],
});

export default InventoryDataSource;
