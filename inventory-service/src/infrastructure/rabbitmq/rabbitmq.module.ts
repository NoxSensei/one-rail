import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AmqpSetupService } from './amqp-setup.service';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        exchanges: [
          {
            name: 'orders.events',
            type: 'topic',
            options: { durable: true },
          },
          {
            name: 'inventory.events',
            type: 'topic',
            options: { durable: true },
          },
        ],
        uri: config.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672',
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  providers: [AmqpSetupService],
  exports: [RabbitMQModule],
})
export class RabbitMQInfrastructureModule {}
