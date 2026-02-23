import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(
    @InjectRepository(Order)
    private readonly repository: Repository<Order>,
  ) {}

  async save(data: Partial<Order>): Promise<Order> {
    let savedId: string;
    try {
      const saved = await this.repository.save(this.repository.create(data));
      savedId = saved.id;
    } catch (error) {
      this.logger.error(`Failed to create order`, (error as Error).stack);
      throw error;
    }

    return this.findById(savedId) as Promise<Order>;
  }

  async findById(id: string): Promise<Order | null> {
    return this.repository.findOne({
      where: { id },
      relations: { items: true },
    });
  }
}
