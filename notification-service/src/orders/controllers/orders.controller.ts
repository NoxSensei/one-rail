import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { OrderCreatedEvent } from '../events/order-created.event';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { deadLetterErrorHandler } from '../../infrastructure/rabbitmq/dead-letter.handler';

@Injectable()
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @RabbitSubscribe({
    exchange: 'orders.events',
    routingKey: 'order.created',
    queue: 'notification-service.orders.created',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'notification-service.dead-letter',
      },
    },
    errorHandler: deadLetterErrorHandler,
  })
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(`Received order.created event for order: ${event.orderId}`);
    await this.notificationsService.notifyOrderCreated(event);
  }
}
