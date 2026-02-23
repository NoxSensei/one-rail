import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { OrdersService } from './orders.service';
import { OrdersRepository } from '../repositories/orders.repository';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-uuid',
  status: OrderStatus.PENDING,
  totalAmount: 150,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  items: [
    {
      id: 'item-uuid',
      productId: 'prod-1',
      quantity: 3,
      price: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
      order: null as unknown as Order,
    } as OrderItem,
  ],
  ...overrides,
});

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<OrdersRepository>;
  let amqpConnection: jest.Mocked<AmqpConnection>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: {
            save: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AmqpConnection,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(OrdersService);
    ordersRepository = module.get(OrdersRepository);
    amqpConnection = module.get(AmqpConnection);
  });

  describe('createOrder', () => {
    it('saves the order and publishes order.created event', async () => {
      const order = makeOrder();
      ordersRepository.save.mockResolvedValue(order);
      amqpConnection.publish.mockResolvedValue(true);

      const dto: CreateOrderDto = {
        items: [{ productId: 'prod-1', quantity: 3, price: 50 }],
      };

      const result = await service.createOrder(dto);

      expect(ordersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.PENDING, totalAmount: 150 }),
      );
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'orders.events',
        'order.created',
        expect.objectContaining({
          eventId: expect.any(String),
          orderId: order.id,
        }),
      );
      expect(result).toBe(order);
    });

    it('computes totalAmount as sum of quantity * price across all items', async () => {
      const order = makeOrder({ totalAmount: 150 });
      ordersRepository.save.mockResolvedValue(order);
      amqpConnection.publish.mockResolvedValue(true);

      await service.createOrder({
        items: [
          { productId: 'p1', quantity: 2, price: 25 },
          { productId: 'p2', quantity: 1, price: 100 },
        ],
      });

      expect(ordersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 150 }),
      );
    });

    it('deletes the order and throws when publishing the event fails', async () => {
      const order = makeOrder();
      ordersRepository.save.mockResolvedValue(order);
      ordersRepository.delete.mockResolvedValue(undefined);
      amqpConnection.publish.mockRejectedValue(new Error('AMQP unavailable'));

      await expect(
        service.createOrder({ items: [{ productId: 'prod-1', quantity: 1, price: 100 }] }),
      ).rejects.toThrow('AMQP unavailable');

      expect(ordersRepository.delete).toHaveBeenCalledWith(order.id);
    });
  });

  describe('getOrderById', () => {
    it('returns the order when found', async () => {
      const order = makeOrder();
      ordersRepository.findById.mockResolvedValue(order);

      const result = await service.getOrderById('order-uuid');

      expect(result).toBe(order);
      expect(ordersRepository.findById).toHaveBeenCalledWith('order-uuid');
    });

    it('throws NotFoundException when order does not exist', async () => {
      ordersRepository.findById.mockResolvedValue(null);

      await expect(service.getOrderById('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
