import { Injectable, Logger } from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { NotificationType } from '../schemas/notification.schema';
import type { OrderCreatedEvent } from '../../orders/events/order-created.event';
import type { InventoryReservedEvent } from '../../inventory/events/inventory-reserved.event';
import type { InventoryFailedEvent } from '../../inventory/events/inventory-failed.event';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async notifyOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const saved = await this.notificationsRepository.create(
      event.eventId,
      event.orderId,
      NotificationType.ORDER_CREATED,
      event as unknown as Record<string, unknown>,
    );

    if (!saved) {
      this.logger.warn(
        `Duplicate event ${event.eventId} for order ${event.orderId}, skipping`,
      );
      return;
    }

    this.logger.log(
      `Stored ORDER_CREATED notification for order: ${event.orderId}`,
    );
  }

  async notifyInventoryReserved(event: InventoryReservedEvent): Promise<void> {
    const saved = await this.notificationsRepository.create(
      event.eventId,
      event.orderId,
      NotificationType.INVENTORY_RESERVED,
      event as unknown as Record<string, unknown>,
    );

    if (!saved) {
      this.logger.warn(
        `Duplicate event ${event.eventId} for order ${event.orderId}, skipping`,
      );
      return;
    }

    this.logger.log(
      `Stored INVENTORY_RESERVED notification for order: ${event.orderId}`,
    );
  }

  async notifyInventoryFailed(event: InventoryFailedEvent): Promise<void> {
    const saved = await this.notificationsRepository.create(
      event.eventId,
      event.orderId,
      NotificationType.INVENTORY_FAILED,
      event as unknown as Record<string, unknown>,
    );

    if (!saved) {
      this.logger.warn(
        `Duplicate event ${event.eventId} for order ${event.orderId}, skipping`,
      );
      return;
    }

    this.logger.log(
      `Stored INVENTORY_FAILED notification for order: ${event.orderId}`,
    );
  }
}
