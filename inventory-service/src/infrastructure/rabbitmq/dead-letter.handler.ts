import { Logger } from '@nestjs/common';
import type { Channel, ConsumeMessage } from 'amqplib';

const logger = new Logger('DeadLetterHandler');

const MAX_RETRIES = 3;

export function deadLetterErrorHandler(
  channel: Channel,
  msg: ConsumeMessage,
  error: unknown,
): void {
  const retryCount: number = msg.properties.headers?.['x-retry-count'] as number ?? 0;
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (retryCount < MAX_RETRIES) {
    logger.warn(
      `Retrying message (attempt ${retryCount + 1}/${MAX_RETRIES}): ${errorMessage}`,
    );
    channel.publish(msg.fields.exchange, msg.fields.routingKey, msg.content, {
      ...msg.properties,
      headers: {
        ...msg.properties.headers,
        'x-retry-count': retryCount + 1,
      },
    });
    channel.ack(msg);
  } else {
    logger.error(
      `Message failed after ${MAX_RETRIES} retries, routing to dead-letter: ${errorMessage}`,
    );
    channel.nack(msg, false, false);
  }
}
