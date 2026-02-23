import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  INVENTORY_FAILED = 'INVENTORY_FAILED',
}

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
  @Prop({ required: true, unique: true })
  eventId: string;

  @Prop({ required: true, index: true })
  orderId: string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
