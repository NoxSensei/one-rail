export interface InventoryFailedEvent {
  eventId: string;
  orderId: string;
  reason: string;
  failedAt: Date;
}
