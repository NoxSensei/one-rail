import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { CreateOrderDto } from '../dto/create-order.dto';
import { Order } from '../entities/order.entity';
import { OrdersService } from '../services/orders.service';
import { ParseIdPipe } from '../pipes/parse-id.pipe';

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: CreateOrderDto): Promise<Order> {
    this.logger.log('POST /orders');
    return this.ordersService.createOrder(dto);
  }

  @Get(':id')
  async getOrder(@Param('id', ParseIdPipe) id: string): Promise<Order> {
    this.logger.log(`GET /orders/${id}`);
    return this.ordersService.getOrderById(id);
  }
}
