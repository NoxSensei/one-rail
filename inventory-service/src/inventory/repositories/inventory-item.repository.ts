import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { InventoryItemEntity } from '../entities/inventory-item.entity';

@Injectable()
export class InventoryItemRepository {
  constructor(
    @InjectRepository(InventoryItemEntity)
    private readonly repository: Repository<InventoryItemEntity>,
  ) {}

  findByProductIdWithLock(
    productId: string,
    manager: EntityManager,
  ): Promise<InventoryItemEntity | null> {
    return manager.findOne(InventoryItemEntity, {
      where: { productId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  save(
    item: InventoryItemEntity,
    manager: EntityManager,
  ): Promise<InventoryItemEntity> {
    return manager.save(InventoryItemEntity, item);
  }
}
