/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from '../repositories/notifications.repository';
import {
  NotificationType,
  NotificationDocument,
} from '../schemas/notification.schema';
import type { OrderCreatedEvent } from '../../orders/events/order-created.event';
import type { InventoryReservedEvent } from '../../inventory/events/inventory-reserved.event';
import type { InventoryFailedEvent } from '../../inventory/events/inventory-failed.event';

const stubDoc = { _id: 'doc-id' } as unknown as NotificationDocument;

const orderCreatedEvent: OrderCreatedEvent = {
  eventId: 'evt-order-1',
  orderId: 'order-1',
  status: 'PENDING',
  totalAmount: 100,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  items: [{ orderItemId: 'item-1', productId: 'p1', quantity: 2, price: 50 }],
};

const inventoryReservedEvent: InventoryReservedEvent = {
  eventId: 'evt-reserved-1',
  orderId: 'order-1',
  reservedAt: new Date('2024-01-01'),
  items: [{ productId: 'p1', quantity: 2 }],
};

const inventoryFailedEvent: InventoryFailedEvent = {
  eventId: 'evt-failed-1',
  orderId: 'order-1',
  reason: 'Insufficient stock',
  failedAt: new Date('2024-01-01'),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationsRepository: jest.Mocked<NotificationsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
    notificationsRepository = module.get(NotificationsRepository);
  });

  describe('notifyOrderCreated', () => {
    it('stores an ORDER_CREATED notification for a new event', async () => {
      notificationsRepository.create.mockResolvedValue(stubDoc);

      await service.notifyOrderCreated(orderCreatedEvent);

      expect(notificationsRepository.create).toHaveBeenCalledWith(
        'evt-order-1',
        'order-1',
        NotificationType.ORDER_CREATED,
        expect.any(Object),
      );
    });

    it('returns early without throwing when event is a duplicate', async () => {
      notificationsRepository.create.mockResolvedValue(null);

      await expect(
        service.notifyOrderCreated(orderCreatedEvent),
      ).resolves.toBeUndefined();
      expect(notificationsRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('notifyInventoryReserved', () => {
    it('stores an INVENTORY_RESERVED notification for a new event', async () => {
      notificationsRepository.create.mockResolvedValue(stubDoc);

      await service.notifyInventoryReserved(inventoryReservedEvent);

      expect(notificationsRepository.create).toHaveBeenCalledWith(
        'evt-reserved-1',
        'order-1',
        NotificationType.INVENTORY_RESERVED,
        expect.any(Object),
      );
    });

    it('returns early without throwing when event is a duplicate', async () => {
      notificationsRepository.create.mockResolvedValue(null);

      await expect(
        service.notifyInventoryReserved(inventoryReservedEvent),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyInventoryFailed', () => {
    it('stores an INVENTORY_FAILED notification for a new event', async () => {
      notificationsRepository.create.mockResolvedValue(stubDoc);

      await service.notifyInventoryFailed(inventoryFailedEvent);

      expect(notificationsRepository.create).toHaveBeenCalledWith(
        'evt-failed-1',
        'order-1',
        NotificationType.INVENTORY_FAILED,
        expect.any(Object),
      );
    });

    it('returns early without throwing when event is a duplicate', async () => {
      notificationsRepository.create.mockResolvedValue(null);

      await expect(
        service.notifyInventoryFailed(inventoryFailedEvent),
      ).resolves.toBeUndefined();
    });
  });
});
