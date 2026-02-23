export interface InventoryReservedEvent {
  eventId: string;
  orderId: string;
  reservedAt: Date;
  items: InventoryReservedEventItem[];
}

export interface InventoryReservedEventItem {
  productId: string;
  quantity: number;
}
