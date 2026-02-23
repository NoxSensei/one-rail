import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItemEntity } from './entities/inventory-item.entity';
import { InventoryItemRepository } from './repositories/inventory-item.repository';
import { InventoryService } from './services/inventory.service';
import { RabbitMQInfrastructureModule } from '../infrastructure/rabbitmq/rabbitmq.module';
import { InventoryReservationEntity } from './entities/inventory-reservation.entity';
import { InventoryReservationRepository } from './repositories/inventory-reservation.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItemEntity, InventoryReservationEntity]),
    RabbitMQInfrastructureModule,
  ],
  providers: [
    InventoryItemRepository,
    InventoryReservationRepository,
    InventoryService,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
