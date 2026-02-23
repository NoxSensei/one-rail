import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import type { ConfirmChannel } from 'amqplib';

const DLX = 'inventory-service.dead-letter';
const DLQ = 'inventory-service.dead-letter.queue';

@Injectable()
export class AmqpSetupService implements OnModuleInit {
  private readonly logger = new Logger(AmqpSetupService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async onModuleInit(): Promise<void> {
    await this.amqpConnection.managedChannel.addSetup(
      async (channel: ConfirmChannel) => {
        await channel.assertExchange(DLX, 'fanout', { durable: true });
        await channel.assertQueue(DLQ, { durable: true });
        await channel.bindQueue(DLQ, DLX, '');

        this.logger.log('AMQP dead letter infrastructure ready');
      },
    );
  }
}
