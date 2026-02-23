import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { DataSource } from 'typeorm';
import type { OrderCreatedEvent } from '../../orders/events/order-created.event';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import type { InventoryReservedEvent } from '../events/inventory-reserved.event';
import type { InventoryFailedEvent } from '../events/inventory-failed.event';
import { InventoryReservationRepository } from '../repositories/inventory-reservation.repository';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly inventoryRepository: InventoryItemRepository,
    private readonly inventoryReservationRepository: InventoryReservationRepository,
    private readonly amqpConnection: AmqpConnection,
    private readonly dataSource: DataSource,
  ) {}

  async reserveInventory(event: OrderCreatedEvent): Promise<void> {
    const { eventId, orderId, items } = event;

    let duplicate = false;

    try {
      await this.dataSource.transaction(async (manager) => {
        const existing =
          await this.inventoryReservationRepository.findByOrderIdWithLock(
            orderId,
            manager,
          );

        if (existing) {
          duplicate = true;
          return;
        }

        await this.inventoryReservationRepository.save({ orderId }, manager);

        for (const item of items) {
          const inventoryItem =
            await this.inventoryRepository.findByProductIdWithLock(
              item.productId,
              manager,
            );

          if (!inventoryItem) {
            throw new Error(`Product ${item.productId} not found in inventory`);
          }

          if (inventoryItem.availableQuantity < item.quantity) {
            throw new Error(
              `Insufficient stock for product ${item.productId}: ` +
                `available=${inventoryItem.availableQuantity}, requested=${item.quantity}`,
            );
          }

          inventoryItem.availableQuantity -= item.quantity;
          inventoryItem.reservedQuantity += item.quantity;
          await this.inventoryRepository.save(inventoryItem, manager);
        }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(
        `Inventory reservation failed for order ${orderId}: ${reason}`,
      );

      const failedEvent: InventoryFailedEvent = {
        eventId: crypto.randomUUID(),
        orderId,
        reason,
        failedAt: new Date(),
      };

      await this.amqpConnection.publish(
        'inventory.events',
        'inventory.failed',
        failedEvent,
      );

      return;
    }

    if (duplicate) {
      this.logger.warn(
        `Duplicate event ${eventId} for order ${orderId}, skipping`,
      );
      return;
    }

    const reservedEvent: InventoryReservedEvent = {
      eventId: crypto.randomUUID(),
      orderId,
      reservedAt: new Date(),
      items: items.map(({ productId, quantity }) => ({
        productId,
        quantity,
      })),
    };

    try {
      await this.amqpConnection.publish(
        'inventory.events',
        'inventory.reserved',
        reservedEvent,
      );

      this.logger.log(`Inventory reserved for order: ${orderId}`);
    } catch (publishError) {
      this.logger.error(
        `Failed to publish inventory.reserved for order ${orderId}, rolling back`,
        (publishError as Error).stack,
      );

      await this.dataSource.transaction(async (manager) => {
        await this.inventoryReservationRepository.deleteByOrderId(
          orderId,
          manager,
        );

        for (const { productId, quantity } of items) {
          const inventoryItem =
            await this.inventoryRepository.findByProductIdWithLock(
              productId,
              manager,
            );

          if (inventoryItem) {
            inventoryItem.availableQuantity += quantity;
            inventoryItem.reservedQuantity -= quantity;
            await this.inventoryRepository.save(inventoryItem, manager);
          }
        }
      });

      throw publishError;
    }
  }
}
