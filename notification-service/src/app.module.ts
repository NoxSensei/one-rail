import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQInfrastructureModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { MongooseInfrastructureModule } from './infrastructure/mongoose/mongoose.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQInfrastructureModule,
    MongooseInfrastructureModule,
    NotificationsModule,
    OrdersModule,
    InventoryModule,
  ],
})
export class AppModule {}
