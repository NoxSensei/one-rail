import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { InventoryItemEntity } from '../entities/inventory-item.entity';
import { InventoryReservationEntity } from '../entities/inventory-reservation.entity';

@Injectable()
export class InventoryReservationRepository {
  constructor(
    @InjectRepository(InventoryReservationEntity)
    private readonly repository: Repository<InventoryReservationEntity>,
  ) {}

  findByOrderIdWithLock(
    orderId: string,
    manager: EntityManager,
  ): Promise<InventoryReservationEntity | null> {
    return manager.findOne(InventoryReservationEntity, {
      where: { orderId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  save(
    item: Omit<InventoryReservationEntity, 'id' | 'createdAt' | 'updatedAt'>,
    manager: EntityManager,
  ): Promise<InventoryReservationEntity> {
    return manager.save(InventoryReservationEntity, item);
  }
}
