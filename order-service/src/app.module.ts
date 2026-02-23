import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeORMInfrastructureModule } from './infrastructure/typeorm/typeorm.module';
import { RabbitMQInfrastructureModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeORMInfrastructureModule,
    RabbitMQInfrastructureModule,
    OrdersModule,
  ],
})
export class AppModule {}
