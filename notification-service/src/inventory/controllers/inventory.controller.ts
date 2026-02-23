import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { InventoryReservedEvent } from '../events/inventory-reserved.event';
import type { InventoryFailedEvent } from '../events/inventory-failed.event';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { deadLetterErrorHandler } from '../../infrastructure/rabbitmq/dead-letter.handler';

const DLX_ARGS = {
  'x-dead-letter-exchange': 'notification-service.dead-letter',
};

@Injectable()
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @RabbitSubscribe({
    exchange: 'inventory.events',
    routingKey: 'inventory.reserved',
    queue: 'notification-service.inventory.reserved',
    queueOptions: { durable: true, arguments: DLX_ARGS },
    errorHandler: deadLetterErrorHandler,
  })
  async handleInventoryReserved(event: InventoryReservedEvent): Promise<void> {
    this.logger.log(
      `Received inventory.reserved event for order: ${event.orderId}`,
    );
    await this.notificationsService.notifyInventoryReserved(event);
  }

  @RabbitSubscribe({
    exchange: 'inventory.events',
    routingKey: 'inventory.failed',
    queue: 'notification-service.inventory.failed',
    queueOptions: { durable: true, arguments: DLX_ARGS },
    errorHandler: deadLetterErrorHandler,
  })
  async handleInventoryFailed(event: InventoryFailedEvent): Promise<void> {
    this.logger.log(
      `Received inventory.failed event for order: ${event.orderId}`,
    );
    await this.notificationsService.notifyInventoryFailed(event);
  }
}
