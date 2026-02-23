# OneRail

A three-service event-driven system built with NestJS, RabbitMQ, MySQL, and MongoDB.

---

## Architecture

```mermaid
graph TD
    Client -->|POST /orders\nGET /orders/:id| OS

    OS["order-service\n:3003\n(MySQL: orders)"]
    IS["inventory-service\n:3001\n(MySQL: inventory)"]
    NS["notification-service\n:3002\n(MongoDB: notifications)"]

    OS -->|"orders.events\norder.created"| RMQ[(RabbitMQ)]

    RMQ -->|"order.created"| IS
    RMQ -->|"order.created"| NS

    IS -->|"inventory.events\ninventory.reserved\nor inventory.failed"| RMQ

    RMQ -->|"inventory.reserved\nor inventory.failed"| NS
```

### Event flow

```mermaid
sequenceDiagram
    participant C as Client
    participant OS as order-service
    participant RMQ as RabbitMQ
    participant IS as inventory-service
    participant NS as notification-service

    C->>OS: POST /orders
    OS->>OS: persist order + items (MySQL)
    OS->>RMQ: order.created
    OS-->>C: 201 Created

    par
        RMQ->>IS: order.created
        IS->>IS: reserve stock in transaction (MySQL)
        alt reservation succeeds
            IS->>RMQ: inventory.reserved
        else product missing or insufficient stock
            IS->>RMQ: inventory.failed
        end
    and
        RMQ->>NS: order.created → store notification (MongoDB)
    end

    RMQ->>NS: inventory.reserved or inventory.failed → store notification (MongoDB)
```

---

## Services

| Service | Port | Database | Role |
|---|---|---|---|
| order-service | 3003 | MySQL `orders` | HTTP API - creates orders, publishes events |
| inventory-service | 3001 | MySQL `inventory` | Consumes `order.created`, reserves stock |
| notification-service | 3002 | MongoDB `notifications` | Consumes all events, stores audit log |

### Infrastructure

| Component | Port | Purpose |
|---|---|---|
| RabbitMQ | 5672 / 15672 | Message broker (management UI on 15672) |
| MySQL  | 3306 | Relational storage for orders and inventory |
| MongoDB  | 27017 | Document storage for notifications |

---

## How to Run

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2

### Start everything

```bash
docker compose up --build
```

All services, databases, and the broker start together. Health checks ensure the databases and RabbitMQ are ready before any service connects. Migrations run automatically on startup.

---

## Happy Path

Two products are pre-seeded on startup: `prod-abc` (100 units) and `prod-xyz` (50 units).

### Step 1 - Create an order

```bash
curl -X POST http://localhost:3003/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": "prod-abc", "quantity": 2, "price": 49.99 },
      { "productId": "prod-xyz", "quantity": 1, "price": 9.99 }
    ]
  }'
```

**Response 201**

```json
{
  "id": "e3d2c1b0-aaaa-bbbb-cccc-000000000001",
  "status": "PENDING",
  "totalAmount": "109.97",
  "createdAt": "2026-02-23T15:00:00.000Z",
  "updatedAt": "2026-02-23T15:00:00.000Z",
  "items": [
    { "id": "...", "productId": "prod-abc", "quantity": 2, "price": "49.99" },
    { "id": "...", "productId": "prod-xyz", "quantity": 1, "price": "9.99" }
  ]
}
```

Copy the returned `id` for the next steps.

### Step 2 - Fetch the order

```bash
curl http://localhost:3003/orders/:id
```

Returns the same shape as above. Returns **404** if the id does not exist.

### Step 3 - Verify inventory was reserved

Connect to MySQL and check that stock was deducted:

```bash
docker compose exec mysql \
  mysql -uroot -proot inventory \
  -e "SELECT productId, availableQuantity, reservedQuantity FROM inventory_items;"
```

```
+------------+-------------------+-------------------+
| productId  | availableQuantity | reservedQuantity  |
+------------+-------------------+-------------------+
| prod-abc   |                98 |                 2 |
| prod-xyz   |                49 |                 1 |
+------------+-------------------+-------------------+
```

### Step 4 - Verify notifications were stored

```bash
docker compose exec mongodb \
  mongosh "mongodb://root:root@localhost:27017/notifications?authSource=admin" \
  --eval 'db.notifications.find({}, {type:1, orderId:1, _id:0}).pretty()'
```

```json
{ "type": "ORDER_CREATED",       "orderId": "e3d2c1b0-..." }
{ "type": "INVENTORY_RESERVED",  "orderId": "e3d2c1b0-..." }
```

You can also inspect the RabbitMQ message flow at **http://localhost:15672** (guest / guest).

---

## Running Tests

Tests are unit tests only (no database or broker required).

```bash
# From each service directory:
cd order-service && npm test
cd inventory-service && npm test
cd notification-service && npm test
```

---

## Design Decisions

### Event-driven, not synchronous RPC

Services communicate exclusively through RabbitMQ exchanges - no HTTP calls between them. This means each service can be deployed, restarted, or scaled independently. The order-service does not know inventory-service exists; it only knows it must publish an event.

### Topic exchanges with dedicated queues per routing key

Each consumer binds its own durable queue to a specific routing key. This lets multiple services subscribe to the same exchange independently, and allows new consumers to be added without touching producers. Having one queue per routing key (rather than one queue per service) also avoids the library dispatching messages to the wrong handler when two routing keys share a queue.

### Idempotent consumers

Every event carries a generated `eventId`. Consumers deduplicate before acting:

- **inventory-service** uses a dedicated `inventory_reservations` table with a unique constraint on `orderId`, locked pessimistically inside a transaction. Only one worker can claim an `orderId` at a time.
- **notification-service** uses a sparse unique index on `eventId` in MongoDB. A duplicate key error (code 11000) is caught and treated as a no-op.

### Retry with dead-letter routing

Consumers track retry attempts in a custom `x-retry-count` message header. On failure the handler re-publishes the message with an incremented count and acknowledges the original. After three failures the message is nacked without requeue, which routes it via the queue's `x-dead-letter-exchange` argument to a dead-letter queue for manual inspection - nothing is silently dropped.

### Transactional rollback on publish failure

If a service successfully commits to the database but then fails to publish the follow-up event, downstream services would never receive it. To prevent this split-brain state:

- **order-service**: if `order.created` publish fails, the saved order is deleted before re-throwing, so the client receives a 500 and can safely retry.
- **inventory-service**: if `inventory.reserved` publish fails after the reservation transaction commits, a compensating transaction deletes the reservation row and restores the original stock quantities before re-throwing, so the consumer NACK causes a retry from a clean state.

### Separate databases per service

Each service owns its own schema and database engine chosen for its workload. The inventory and order services use MySQL for strong transactional guarantees and foreign-key integrity. The notification service uses MongoDB because it stores arbitrary event payloads with no fixed schema - a document store is a natural fit and avoids defining a column for every possible event field.
