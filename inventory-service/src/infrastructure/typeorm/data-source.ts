// ensures .env is loaded when used via TypeORM CLI (outside NestJS)
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AddInventoryEntity1771813703834 } from '../../../migrations/1771813703834-add_inventory_entity';
import { AddInventoryReservationEntity1771821095893 } from '../../../migrations/1771821095893-add_inventory_reservation_entity';
import { SeedInventoryItems1771821095895 } from '../../../migrations/1771821095895-seed_inventory_items';

// Connection-only options shared with the NestJS module.
// migrations is an array of classes so TypeORM never has to require() .ts files at runtime.
export const connectionOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.MYSQL_HOST ?? 'localhost',
  port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
  username: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  database: process.env.MYSQL_DATABASE ?? 'inventory',
  synchronize: false,
  migrations: [
    AddInventoryEntity1771813703834,
    AddInventoryReservationEntity1771821095893,
    SeedInventoryItems1771821095895,
  ],
};

// Full DataSource used by the TypeORM CLI for migrations
const InventoryDataSource = new DataSource({
  ...connectionOptions,
  entities: ['src/**/*.entity.ts'],
});

export default InventoryDataSource;
