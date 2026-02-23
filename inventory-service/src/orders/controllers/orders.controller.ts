import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { OrderCreatedEvent } from '../events/order-created.event';
import { InventoryService } from '../../inventory/services/inventory.service';
import { deadLetterErrorHandler } from '../../infrastructure/rabbitmq/dead-letter.handler';

@Injectable()
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @RabbitSubscribe({
    exchange: 'orders.events',
    routingKey: 'order.created',
    queue: 'inventory-service.orders.created',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'inventory-service.dead-letter',
      },
    },
    errorHandler: deadLetterErrorHandler,
  })
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(`Received order.created event for order: ${event.orderId}`);
    await this.inventoryService.reserveInventory(event);
  }
}
