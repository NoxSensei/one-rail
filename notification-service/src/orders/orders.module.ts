import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [OrdersController],
})
export class OrdersModule {}
