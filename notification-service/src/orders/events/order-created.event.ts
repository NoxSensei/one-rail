export interface OrderCreatedEvent {
  eventId: string;
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  items: OrderCreatedEventItem[];
}

export interface OrderCreatedEventItem {
  orderItemId: string;
  productId: string;
  quantity: number;
  price: number;
}
