/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access  */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import request from 'supertest';
import { OrdersController } from '../src/orders/controllers/orders.controller';
import { OrdersService } from '../src/orders/services/orders.service';
import { OrdersRepository } from '../src/orders/repositories/orders.repository';
import { Order } from '../src/orders/entities/order.entity';
import { OrderItem } from '../src/orders/entities/order-item.entity';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let publishSpy: jest.Mock;

  beforeAll(async () => {
    publishSpy = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Order, OrderItem],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Order, OrderItem]),
      ],
      controllers: [OrdersController],
      providers: [
        OrdersService,
        OrdersRepository,
        { provide: AmqpConnection, useValue: { publish: publishSpy } },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    publishSpy.mockClear();
  });

  describe('POST /orders', () => {
    it('201 — creates an order and returns it with computed totalAmount', async () => {
      const { status, body } = await request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            { productId: 'prod-abc', quantity: 2, price: 50 },
            { productId: 'prod-xyz', quantity: 1, price: 10 },
          ],
        });

      expect(status).toBe(201);
      expect(body).toMatchObject({
        id: expect.any(String),
        status: 'PENDING',
        items: [
          expect.objectContaining({ productId: 'prod-abc', quantity: 2 }),
          expect.objectContaining({ productId: 'prod-xyz', quantity: 1 }),
        ],
      });
      expect(Number(body.totalAmount)).toBe(110);
    });

    it('201 — publishes order.created with eventId and correct orderId', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [{ productId: 'prod-abc', quantity: 1, price: 20 }] });

      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        'orders.events',
        'order.created',
        expect.objectContaining({
          eventId: expect.any(String),
          orderId: body.id,
          items: [
            expect.objectContaining({ productId: 'prod-abc', quantity: 1 }),
          ],
        }),
      );
    });

    it('400 — rejects when items array is empty', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [] });

      expect(status).toBe(400);
    });

    it('400 — rejects when items field is missing', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/orders')
        .send({});

      expect(status).toBe(400);
    });

    it('400 — rejects when productId is empty', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [{ productId: '', quantity: 1, price: 10 }] });

      expect(status).toBe(400);
    });

    it('400 — rejects when quantity is 0', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [{ productId: 'prod-abc', quantity: 0, price: 10 }] });

      expect(status).toBe(400);
    });

    it('400 — rejects when price is negative', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [{ productId: 'prod-abc', quantity: 1, price: -1 }] });

      expect(status).toBe(400);
    });

    it('500 — deletes the order and propagates error when broker publish fails', async () => {
      publishSpy.mockRejectedValueOnce(new Error('broker down'));

      const { status } = await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [{ productId: 'prod-abc', quantity: 1, price: 10 }] });

      expect(status).toBe(500);
    });
  });

  describe('GET /orders/:id', () => {
    let orderId: string;

    beforeAll(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/orders')
        .send({ items: [{ productId: 'prod-abc', quantity: 3, price: 15 }] });

      orderId = body.id;
    });

    it('200 — returns the order with its items', async () => {
      const { status, body } = await request(app.getHttpServer()).get(
        `/orders/${orderId}`,
      );

      expect(status).toBe(200);
      expect(body).toMatchObject({
        id: orderId,
        status: 'PENDING',
        items: [
          expect.objectContaining({ productId: 'prod-abc', quantity: 3 }),
        ],
      });
      expect(Number(body.totalAmount)).toBe(45);
    });

    it('404 — returns 404 for an id that does not exist', async () => {
      const { status } = await request(app.getHttpServer()).get(
        '/orders/00000000-0000-0000-0000-000000000000',
      );

      expect(status).toBe(404);
    });

    it('400 — rejects a single-character id', async () => {
      const { status } = await request(app.getHttpServer()).get('/orders/x');

      expect(status).toBe(400);
    });
  });
});
