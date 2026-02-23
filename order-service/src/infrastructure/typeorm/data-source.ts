// ensures .env is loaded when used via TypeORM CLI (outside NestJS)
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AddOrderEntities1771798851762 } from '../../../migrations/1771798851762-add_order_entities';

// Connection-only options shared with the NestJS module.
// migrations is an array of classes so TypeORM never has to require() .ts files at runtime.
export const connectionOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.MYSQL_HOST ?? 'localhost',
  port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
  username: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DATABASE ?? 'orders',
  synchronize: false,
  migrations: [AddOrderEntities1771798851762],
};

// Full DataSource used by the TypeORM CLI for migrations
const OrdersDataSource = new DataSource({
  ...connectionOptions,
  entities: ['src/**/*.entity.ts'],
});

export default OrdersDataSource;
