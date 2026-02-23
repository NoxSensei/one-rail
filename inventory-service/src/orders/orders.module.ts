import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { TypeORMInfrastructureModule } from '../infrastructure/typeorm/typeorm.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [TypeORMInfrastructureModule, InventoryModule],
  providers: [OrdersController],
})
export class OrdersModule {}
