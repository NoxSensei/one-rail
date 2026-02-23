import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [InventoryController],
})
export class InventoryModule {}
