/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { DataSource, EntityManager } from 'typeorm';
import { InventoryService } from './inventory.service';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { InventoryReservationRepository } from '../repositories/inventory-reservation.repository';
import { InventoryItemEntity } from '../entities/inventory-item.entity';
import { InventoryReservationEntity } from '../entities/inventory-reservation.entity';
import type { OrderCreatedEvent } from '../../orders/events/order-created.event';

const makeItem = (
  overrides: Partial<InventoryItemEntity> = {},
): InventoryItemEntity => ({
  id: 'inv-uuid',
  productId: 'prod-1',
  availableQuantity: 10,
  reservedQuantity: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const baseEvent: OrderCreatedEvent = {
  eventId: 'evt-uuid',
  orderId: 'order-uuid',
  status: 'PENDING',
  totalAmount: 150,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  items: [
    { orderItemId: 'item-1', productId: 'prod-1', quantity: 3, price: 50 },
  ],
};

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepository: jest.Mocked<InventoryItemRepository>;
  let inventoryReservationRepository: jest.Mocked<InventoryReservationRepository>;
  let amqpConnection: jest.Mocked<AmqpConnection>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryItemRepository,
          useValue: {
            findByProductIdWithLock: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: InventoryReservationRepository,
          useValue: {
            findByOrderIdWithLock: jest.fn(),
            save: jest.fn(),
            deleteByOrderId: jest.fn(),
          },
        },
        {
          provide: AmqpConnection,
          useValue: { publish: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest
              .fn()
              .mockImplementation(
                (cb: (manager: EntityManager) => Promise<void>) =>
                  cb({} as EntityManager),
              ),
          },
        },
      ],
    }).compile();

    service = module.get(InventoryService);
    inventoryRepository = module.get(InventoryItemRepository);
    inventoryReservationRepository = module.get(InventoryReservationRepository);
    amqpConnection = module.get(AmqpConnection);
  });

  describe('reserveInventory', () => {
    it('creates a reservation, deducts stock, and publishes inventory.reserved', async () => {
      inventoryReservationRepository.findByOrderIdWithLock.mockResolvedValue(
        null,
      );
      inventoryReservationRepository.save.mockResolvedValue(
        {} as InventoryReservationEntity,
      );
      const item = makeItem();
      inventoryRepository.findByProductIdWithLock.mockResolvedValue(item);
      inventoryRepository.save.mockResolvedValue(item);
      amqpConnection.publish.mockResolvedValue(true);

      await service.reserveInventory(baseEvent);

      expect(inventoryReservationRepository.save).toHaveBeenCalledWith(
        { orderId: 'order-uuid' },
        expect.anything(),
      );
      expect(inventoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ availableQuantity: 7, reservedQuantity: 3 }),
        expect.anything(),
      );
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'inventory.events',
        'inventory.reserved',
        expect.objectContaining({
          eventId: expect.any(String),
          orderId: 'order-uuid',
        }),
      );
    });

    it('skips processing and publishing when reservation already exists (duplicate)', async () => {
      inventoryReservationRepository.findByOrderIdWithLock.mockResolvedValue({
        id: 'res-uuid',
        orderId: 'order-uuid',
      } as InventoryReservationEntity);

      await service.reserveInventory(baseEvent);

      expect(inventoryReservationRepository.save).not.toHaveBeenCalled();
      expect(
        inventoryRepository.findByProductIdWithLock,
      ).not.toHaveBeenCalled();
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });

    it('publishes inventory.failed when a product is not found in inventory', async () => {
      inventoryReservationRepository.findByOrderIdWithLock.mockResolvedValue(
        null,
      );
      inventoryReservationRepository.save.mockResolvedValue(
        {} as InventoryReservationEntity,
      );
      inventoryRepository.findByProductIdWithLock.mockResolvedValue(null);
      amqpConnection.publish.mockResolvedValue(true);

      await service.reserveInventory(baseEvent);

      expect(inventoryRepository.save).not.toHaveBeenCalled();
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'inventory.events',
        'inventory.failed',
        expect.objectContaining({
          orderId: 'order-uuid',
          reason: expect.stringContaining('not found'),
        }),
      );
    });

    it('publishes inventory.failed when stock is insufficient', async () => {
      inventoryReservationRepository.findByOrderIdWithLock.mockResolvedValue(
        null,
      );
      inventoryReservationRepository.save.mockResolvedValue(
        {} as InventoryReservationEntity,
      );
      const item = makeItem({ availableQuantity: 1 }); // requested 3
      inventoryRepository.findByProductIdWithLock.mockResolvedValue(item);
      amqpConnection.publish.mockResolvedValue(true);

      await service.reserveInventory(baseEvent);

      expect(inventoryRepository.save).not.toHaveBeenCalled();
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'inventory.events',
        'inventory.failed',
        expect.objectContaining({
          orderId: 'order-uuid',
          reason: expect.stringContaining('Insufficient stock'),
        }),
      );
    });

    it('rolls back reservation and stock then throws when publishing inventory.reserved fails', async () => {
      inventoryReservationRepository.findByOrderIdWithLock.mockResolvedValue(
        null,
      );
      inventoryReservationRepository.save.mockResolvedValue(
        {} as InventoryReservationEntity,
      );
      inventoryReservationRepository.deleteByOrderId.mockResolvedValue(
        undefined,
      );
      const item = makeItem();
      inventoryRepository.findByProductIdWithLock.mockResolvedValue(item);
      inventoryRepository.save.mockResolvedValue(item);
      amqpConnection.publish.mockRejectedValue(new Error('AMQP unavailable'));

      await expect(service.reserveInventory(baseEvent)).rejects.toThrow(
        'AMQP unavailable',
      );

      expect(
        inventoryReservationRepository.deleteByOrderId,
      ).toHaveBeenCalledWith('order-uuid', expect.anything());
      expect(inventoryRepository.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ availableQuantity: 10, reservedQuantity: 0 }),
        expect.anything(),
      );
    });

    it('handles events with multiple items, updating all of them', async () => {
      const multiItemEvent: OrderCreatedEvent = {
        ...baseEvent,
        items: [
          {
            orderItemId: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            price: 50,
          },
          {
            orderItemId: 'item-2',
            productId: 'prod-2',
            quantity: 1,
            price: 100,
          },
        ],
      };

      inventoryReservationRepository.findByOrderIdWithLock.mockResolvedValue(
        null,
      );
      inventoryReservationRepository.save.mockResolvedValue(
        {} as InventoryReservationEntity,
      );

      const item1 = makeItem({ productId: 'prod-1', availableQuantity: 5 });
      const item2 = makeItem({
        id: 'inv-uuid-2',
        productId: 'prod-2',
        availableQuantity: 3,
      });
      inventoryRepository.findByProductIdWithLock
        .mockResolvedValueOnce(item1)
        .mockResolvedValueOnce(item2);
      inventoryRepository.save.mockResolvedValue(item1);
      amqpConnection.publish.mockResolvedValue(true);

      await service.reserveInventory(multiItemEvent);

      expect(inventoryRepository.save).toHaveBeenCalledTimes(2);
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'inventory.events',
        'inventory.reserved',
        expect.objectContaining({ orderId: 'order-uuid' }),
      );
    });
  });
});
