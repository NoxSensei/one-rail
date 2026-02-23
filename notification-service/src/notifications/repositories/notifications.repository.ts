import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from '../schemas/notification.schema';

const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  // Returns null when the eventId already exists (duplicate), the saved document otherwise.
  async create(
    eventId: string,
    orderId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<NotificationDocument | null> {
    try {
      return await this.model.create({ eventId, orderId, type, payload });
    } catch (error: unknown) {
      if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) {
        return null;
      }
      throw error;
    }
  }
}
