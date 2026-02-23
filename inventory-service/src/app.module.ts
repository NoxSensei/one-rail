import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQInfrastructureModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { OrdersModule } from './orders/orders.module';
import { TypeORMInfrastructureModule } from './infrastructure/typeorm/typeorm.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQInfrastructureModule,
    TypeORMInfrastructureModule,
    OrdersModule,
    InventoryModule,
  ],
})
export class AppModule {}
