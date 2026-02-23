import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { CreateOrderDto } from '../dto/create-order.dto';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrdersRepository } from '../repositories/orders.repository';
import type { OrderCreatedEvent } from '../events/order-created.event';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    const items: Partial<OrderItem>[] = dto.items.map(
      ({ productId, quantity, price }) => ({ productId, quantity, price }),
    );

    const saved = await this.ordersRepository.save({
      items: items as OrderItem[],
      totalAmount,
      status: OrderStatus.PENDING,
    });
    this.logger.log(`Order created successfully: ${saved.id}`);

    try {
      await this.publishOrderCreated(saved);
    } catch (error) {
      this.logger.error(
        `Failed to publish order.created event for order: ${saved.id}, rolling back`,
        (error as Error).stack,
      );
      await this.ordersRepository.delete(saved.id);
      throw error;
    }

    return saved;
  }

  async getOrderById(id: string): Promise<Order> {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return order;
  }

  private async publishOrderCreated(order: Order): Promise<void> {
    const event: OrderCreatedEvent = {
      eventId: crypto.randomUUID(),
      orderId: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map(({ id, productId, quantity, price }) => ({
        orderItemId: id,
        productId,
        quantity,
        price,
      })),
    };

    await this.amqpConnection.publish('orders.events', 'order.created', event);
    this.logger.log(`Published order.created event for order: ${order.id}`);
  }
}
