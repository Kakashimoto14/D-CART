# D'Cart Production Architecture Blueprint

## 1. Current-State Assessment

The current system is already a modular monolith with the correct baseline stack:

- React + Vite frontend
- Express + Prisma + MySQL backend
- JWT auth
- Socket.IO realtime updates
- checkout, picking, delivery slots, geofencing, and GCash checkout support

The main gaps are not architectural scale problems. They are grocery-operations problems:

- stock is decremented directly during checkout instead of using a reservation lifecycle
- inventory is product-level only, not batch-level
- picker workflow is coarse and does not track scanned picks, staging, or packing verification
- substitutions are operationally basic and not customer-approval driven
- delivery operations do not yet model rider dispatch, live tracking, and route sequencing
- payment handling needs stronger idempotency, retry, and audit controls
- observability, queues, and testing are still lightweight for production use

The right target is a **single-store modular monolith** with stronger modules, better state modeling, Redis-backed coordination, and queue-backed async work.

## 2. Target Architecture

### Core principle

Keep one deployable backend application and one frontend application. Split complexity by domain modules, not by services.

### Target backend modules

- `auth`
- `catalog`
- `inventory`
- `cart`
- `checkout`
- `orders`
- `fulfillment`
- `delivery`
- `payments`
- `notifications`
- `operations`
- `analytics`
- `audit`
- `realtime`
- `shared`

### Execution model

- HTTP API for command/query requests
- Socket.IO for live operational events
- Redis for short-lived coordination and caching
- BullMQ for non-blocking jobs and retries
- MySQL as source of truth

### Architecture style

- modular monolith
- domain-oriented service layer
- Prisma repositories or query services for persistence
- DTO-based input/output boundaries
- explicit state machines for order, fulfillment, delivery, and payment status

## 3. Proposed Backend Folder Structure

```text
backend/
  src/
    app/
      app.js
      server.js
      bootstrap/
      config/
    modules/
      auth/
        auth.controller.js
        auth.service.js
        auth.repository.js
        auth.schemas.js
        auth.routes.js
      catalog/
      inventory/
        inventory.controller.js
        inventory.service.js
        inventory.repository.js
        inventory.schemas.js
        inventory.routes.js
        batch-allocation.service.js
        reservation.service.js
        stock-audit.service.js
      checkout/
        checkout.controller.js
        checkout.service.js
        pricing.service.js
        checkout.schemas.js
      orders/
      fulfillment/
        picking.service.js
        packing.service.js
        substitution.service.js
        staging.service.js
      delivery/
        dispatch.service.js
        routing.service.js
        tracking.service.js
        fee.service.js
      payments/
        payments.controller.js
        payments.service.js
        paymongo.provider.js
        webhook.service.js
      notifications/
        notifications.service.js
        email.provider.js
        sms.provider.js
        push.provider.js
      analytics/
      audit/
      realtime/
    infrastructure/
      prisma/
      redis/
      queue/
      logger/
      storage/
      monitoring/
    shared/
      errors/
      middleware/
      dto/
      utils/
      constants/
```

## 4. Database Schema Evolution

The current schema is good for MVP ordering, but not for real grocery operations. Keep `Product`, `Order`, `OrderItem`, `Delivery`, and `DeliverySlot`, then extend around them.

### Inventory and batch tables

- `InventoryItem`
  - `id`
  - `productId` unique
  - `onHandQty`
  - `reservedQty`
  - `availableQty`
  - `reorderPoint`
  - `reorderQty`
  - `safetyStockQty`
  - `isActive`
  - `updatedAt`

- `InventoryBatch`
  - `id`
  - `inventoryItemId`
  - `batchCode`
  - `supplierId`
  - `receivedAt`
  - `expiresAt`
  - `unitCost`
  - `receivedQty`
  - `remainingQty`
  - `status` (`ACTIVE`, `NEAR_EXPIRY`, `EXPIRED`, `QUARANTINED`, `DEPLETED`)

- `InventoryReservation`
  - `id`
  - `orderId` nullable until order commit
  - `cartSessionKey`
  - `status` (`ACTIVE`, `COMMITTED`, `RELEASED`, `EXPIRED`)
  - `expiresAt`
  - `createdByUserId`
  - `createdAt`

- `InventoryReservationItem`
  - `id`
  - `reservationId`
  - `productId`
  - `batchId`
  - `quantity`

- `InventoryMovement`
  - `id`
  - `productId`
  - `batchId` nullable
  - `type` (`RECEIVE`, `RESERVE`, `RELEASE`, `COMMIT`, `ADJUST`, `DAMAGE`, `EXPIRE`, `RETURN`, `SUBSTITUTE_OUT`, `SUBSTITUTE_IN`)
  - `quantityDelta`
  - `referenceType`
  - `referenceId`
  - `reason`
  - `actorUserId`
  - `metadataJson`
  - `createdAt`

- `Supplier`
  - `id`
  - `name`
  - `contactName`
  - `phone`
  - `email`
  - `notes`

### Fulfillment tables

- `FulfillmentOrder`
  - `orderId` PK/FK
  - `status` (`QUEUED`, `PICKING`, `PICKED`, `PACKING`, `PACKED`, `STAGED`, `DISPATCHED`, `COMPLETED`, `ISSUE`)
  - `priority`
  - `zone`
  - `stagingLabel`
  - `assignedPickerId`
  - `assignedPackerId`
  - `pickedAt`
  - `packedAt`
  - `stagedAt`

- `FulfillmentTask`
  - `id`
  - `orderId`
  - `type` (`PICK`, `PACK`, `VERIFY`, `SUBSTITUTION_REVIEW`)
  - `status`
  - `assignedUserId`
  - `sequenceNo`
  - `startedAt`
  - `completedAt`

- `PickItem`
  - `id`
  - `orderItemId`
  - `batchId`
  - `requestedQty`
  - `pickedQty`
  - `status` (`PENDING`, `PICKED`, `UNAVAILABLE`, `SUBSTITUTED`, `PARTIAL`)
  - `scannedBarcode`
  - `pickedByUserId`
  - `pickedAt`

- `SubstitutionRequest`
  - `id`
  - `orderItemId`
  - `originalProductId`
  - `suggestedProductId`
  - `status` (`PENDING_CUSTOMER`, `APPROVED`, `DECLINED`, `AUTO_APPROVED`, `EXPIRED`)
  - `priceDelta`
  - `note`
  - `respondedAt`

### Delivery tables

- `Rider`
  - `id`
  - `userId`
  - `vehicleType`
  - `isActive`
  - `isAvailable`
  - `currentLatitude`
  - `currentLongitude`
  - `lastSeenAt`

- `DeliveryAssignment`
  - `id`
  - `deliveryId`
  - `riderId`
  - `status` (`ASSIGNED`, `ACCEPTED`, `PICKED_UP`, `DELIVERED`, `FAILED`, `REASSIGNED`)
  - `assignedAt`
  - `acceptedAt`
  - `pickedUpAt`
  - `completedAt`

- `DeliveryTrackingPoint`
  - `id`
  - `deliveryId`
  - `latitude`
  - `longitude`
  - `speedKph`
  - `recordedAt`

### Payments and security tables

- `PaymentTransaction`
  - `id`
  - `orderId`
  - `provider`
  - `method`
  - `status`
  - `amount`
  - `providerReference`
  - `idempotencyKey`
  - `rawResponseJson`
  - `paidAt`
  - `failedAt`

- `WebhookEvent`
  - `id`
  - `provider`
  - `eventType`
  - `eventId`
  - `signatureValid`
  - `processedAt`
  - `payloadJson`
  - unique index on `provider + eventId`

- `RefreshToken`
  - `id`
  - `userId`
  - `tokenHash`
  - `expiresAt`
  - `revokedAt`
  - `deviceInfo`
  - `ipAddress`

- `AdminTwoFactor`
  - `userId`
  - `secret`
  - `recoveryCodesHash`
  - `enabledAt`

### Audit and notifications tables

- `AuditLog`
  - `id`
  - `actorUserId`
  - `action`
  - `entityType`
  - `entityId`
  - `beforeJson`
  - `afterJson`
  - `ipAddress`
  - `createdAt`

- `Notification`
  - `id`
  - `userId`
  - `channel`
  - `template`
  - `status`
  - `payloadJson`
  - `sentAt`
  - `failedAt`

## 5. State Model Changes

### Order status

Replace the current coarse status flow with:

- `DRAFT`
- `AWAITING_PAYMENT`
- `PLACED`
- `CONFIRMED`
- `PICKING`
- `AWAITING_SUBSTITUTION`
- `PACKING`
- `READY_FOR_DISPATCH`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `PARTIALLY_FULFILLED`
- `CANCELLED`
- `FAILED`

### Payment status

- `PENDING`
- `AUTHORIZED`
- `PAID`
- `FAILED`
- `EXPIRED`
- `REFUNDED`
- `PARTIALLY_REFUNDED`

### Delivery status

- `QUEUED`
- `ASSIGNED`
- `ACCEPTED`
- `PICKED_UP`
- `EN_ROUTE`
- `ARRIVED`
- `DELIVERED`
- `FAILED`
- `CANCELLED`

## 6. Redis Integration Strategy

Redis should be operational glue, not the source of truth.

### Use cases

- stock reservation lock keys
- reservation TTL tracking
- idempotency keys
- rate limiting
- short-term product/search cache
- live rider presence
- websocket pub/sub for horizontal scaling
- session and refresh-token denylist support

### Key patterns

- `inventory:lock:product:{productId}`
- `inventory:reservation:{reservationId}`
- `inventory:cart:{cartSessionKey}`
- `payment:idempotency:{provider}:{key}`
- `auth:refresh:blacklist:{tokenId}`
- `rider:presence:{riderId}`
- `socket:user:{userId}`

### Reservation flow

1. customer enters checkout review
2. backend validates requested quantities
3. backend acquires product-level locks in Redis in stable order
4. backend allocates quantities from batches using FIFO
5. backend writes `InventoryReservation` plus movement records in MySQL transaction
6. backend writes reservation TTL metadata to Redis
7. on payment completion or COD commit, reservation becomes `COMMITTED`
8. if customer abandons checkout or payment expires, BullMQ release job frees reservation

### Important rule

Never rely on Redis alone for inventory truth. Redis is for lock orchestration and expiry scheduling; MySQL remains authoritative.

## 7. Inventory Architecture

### Stock formula

- `onHandQty`: physically present stock
- `reservedQty`: committed to active reservations
- `availableQty = onHandQty - reservedQty`

### Allocation strategy

- default FIFO by earliest expiration date, then earliest received date
- blocked if batch is expired or quarantined
- optional markdown surfaced for near-expiry items

### Receiving workflow

1. admin or receiver opens receiving session
2. scan or input product barcode
3. enter batch details: supplier, qty, received date, expiration, cost
4. create `InventoryBatch`
5. increase `InventoryItem.onHandQty`
6. append `InventoryMovement` with type `RECEIVE`

### Adjustment workflow

Support explicit reasons:

- damaged
- spoiled
- expired disposal
- cycle count correction
- supplier return
- manual correction

Every adjustment must create an audit and inventory movement record.

### Near-expiry management

- configurable thresholds: 3, 7, 14 days
- dashboard widgets for near-expiry stock
- block sale if expired
- optional discount pricing rule for near-expiry inventory

## 8. Grocery Fulfillment Workflow

### Operational workflow

1. order placed
2. payment confirmed or COD approved
3. reservation committed
4. order enters pick queue
5. picker claims or auto-assigns order
6. picker scans each picked item
7. unavailable items trigger substitution or partial fulfillment path
8. picked order moves to packing
9. packer verifies counts and fragile/cold handling
10. order receives staging label and holding area assignment
11. dispatch assigns rider
12. order leaves store
13. customer receives live tracking and final proof of delivery

### Picker UX requirements

- queue sorted by delivery slot urgency, order age, and batch expiry risk
- item-by-item scan confirmation
- aisle/category grouping for faster picking
- “cannot find item” flow with reason codes
- substitution recommendations ranked by category, brand, size, and price tolerance

### Packing workflow

- verify picked quantities against order
- verify substitutions were approved or allowed by customer preference
- print/assign bag count and staging label
- mark cold/frozen items for late-stage pack timing

### Partial fulfillment rules

- reduce unavailable quantity
- recalculate totals automatically
- create refund/store-credit record if already paid
- persist a customer-visible reason for every changed item

## 9. Delivery Architecture

### Single-store dispatch model

Because this is one store, dispatch should optimize for simplicity:

- same-day rolling queue
- scheduled slot queue
- rider availability board
- manual assignment with suggestion engine

### Rider assignment logic

Score riders by:

- availability
- active load
- proximity to store
- proximity to clustered delivery area
- slot urgency

### Routing logic

Do not overbuild full route optimization. Use pragmatic heuristics:

- cluster deliveries by barangay/zone
- sort by nearest-next stop
- bias earlier slot deadlines first
- recalc ETA after every status update

### Live tracking

- rider app emits GPS every 10-20 seconds while active
- backend stores sampled points
- frontend shows customer-safe location and ETA
- admin sees all active deliveries in one live board

## 10. Realtime Event Architecture

The current `orders:changed` event is too generic. Keep it, but add domain events.

### Socket channels

- `orders:{orderId}`
- `user:{userId}`
- `operations`
- `pickers`
- `dispatch`
- `riders:{riderId}`

### Event types

- `order.created`
- `order.confirmed`
- `order.status_changed`
- `inventory.low_stock`
- `inventory.near_expiry`
- `fulfillment.pick_started`
- `fulfillment.item_picked`
- `fulfillment.substitution_requested`
- `fulfillment.substitution_resolved`
- `fulfillment.packed`
- `delivery.assigned`
- `delivery.location_updated`
- `delivery.arriving`
- `delivery.completed`
- `payment.paid`
- `payment.failed`

### Scaling model

- single Node process is acceptable first
- when needed, scale Socket.IO horizontally with Redis adapter
- keep event payloads compact and versioned

## 11. Queue Architecture with BullMQ

### Queues

- `notifications`
- `payments-webhook`
- `reservation-expiry`
- `inventory-alerts`
- `receipts`
- `analytics-rollups`
- `delivery-eta-refresh`

### Jobs

- send email/SMS/push notifications
- retry transient PayMongo webhook handling safely
- expire and release abandoned reservations
- generate daily operational summaries
- compute near-expiry and low-stock alerts
- generate receipts asynchronously

### Queue rule

Anything non-user-blocking and retryable should leave the request cycle and move into BullMQ.

## 12. Frontend Evolution

### Customer app

Add:

- smart search with debounced autocomplete
- favorites, saved grocery lists, and repeat order
- substitution preferences per item/order
- delivery slot calendar with cutoffs
- order timeline with realtime updates
- PWA installability and offline cached browsing

### Operations admin app

Split the current large dashboard into dedicated pages:

- `Operations Overview`
- `Inventory Control`
- `Receiving`
- `Expiry & Low Stock`
- `Fulfillment Board`
- `Dispatch Board`
- `Payments & Refunds`
- `Audit Logs`
- `Analytics`

### Picker app

Move from list view to a workflow screen:

- claim queue
- active pick list
- scan-first item confirmation
- substitution action sheet
- packing handoff

### Rider app

Minimal but operational:

- assigned deliveries
- accept/reject assignment
- navigation launch
- status buttons
- GPS background updates
- proof of delivery upload/signature

## 13. Payment Hardening Strategy

### Supported methods

- `COD`
- `GCASH`
- `MAYA`
- `PAYMONGO_CARD` if later needed through PayMongo

### Required controls

- idempotency key for checkout session creation
- webhook event deduplication
- verified webhook signature
- safe retry on transient provider/network errors
- immutable transaction log
- refund records tied to order adjustments

### Payment flow

For digital payments:

1. create order in `AWAITING_PAYMENT`
2. create stock reservation
3. create payment transaction row
4. redirect to provider
5. webhook confirms payment
6. idempotently mark payment paid
7. commit reservation and move order to fulfillment queue

For COD:

1. validate order
2. create reservation
3. auto-confirm order if policy allows
4. commit reservation immediately
5. collect COD at delivery

## 14. Security Strategy

### Authentication

- short-lived access tokens
- hashed refresh tokens in DB
- token rotation
- device/session revocation

### Admin hardening

- TOTP 2FA for admins
- stricter password rules
- login attempt throttling
- IP and device logging

### API protection

- `helmet`
- route-specific rate limits
- Zod validation at every boundary
- sanitize inputs
- strong CORS allowlist
- CSRF protection for cookie-based flows if adopted
- consistent authz policy per route and action

### Secrets and compliance

- do not log raw tokens or payment secrets
- encrypt sensitive operational secrets at rest where feasible
- separate staging and production credentials

## 15. Testing Strategy

### Backend

Use:

- Jest
- Supertest

Test suites:

- auth and token rotation
- checkout reservation lifecycle
- concurrent stock reservation race conditions
- batch FIFO allocation
- substitution approval flow
- webhook idempotency
- refund and partial fulfillment handling

### Frontend

Use:

- Vitest
- React Testing Library

Test:

- product search
- cart and checkout flow
- substitution decision UI
- realtime order timeline updates
- admin dispatch board interactions

### E2E

Use Playwright for:

- customer order from cart to delivery completion
- admin receiving and inventory adjustment
- picker claim, scan, substitute, pack flow
- rider delivery tracking flow

### Reliability tests

- concurrent checkout simulation
- reservation expiry job correctness
- webhook replay handling
- socket reconnect behavior

## 16. Observability and Monitoring

### Logging

Replace `morgan`-only visibility with structured logs using `Pino`.

Log fields:

- `requestId`
- `userId`
- `orderId`
- `reservationId`
- `paymentTransactionId`
- `deliveryId`
- `queueJobId`

### Monitoring

- Sentry for exceptions
- Prometheus metrics endpoint
- Grafana dashboards

### Key metrics

- checkout success rate
- reservation expiry count
- oversell prevention conflicts
- low-stock alert count
- pick duration per order
- substitution rate
- packing duration
- on-time delivery rate
- payment failure rate
- websocket connection failures

## 17. Deployment Architecture

### Production topology

- `frontend` static app behind Nginx
- `backend` Node app
- `postgres`
- `redis`
- optional worker process for BullMQ

### Docker Compose services

- `nginx`
- `frontend`
- `backend`
- `worker`
- `postgres`
- `redis`

### Nginx responsibilities

- TLS termination
- reverse proxy to backend
- serve built frontend
- websocket upgrade support
- caching headers for static assets
- request size limits

### CI/CD

GitHub Actions pipeline:

1. lint
2. unit tests
3. integration tests
4. frontend build
5. backend build validation
6. docker image build
7. deploy to staging
8. smoke test
9. manual approval to production

## 18. Database and Query Optimization

### Add indexes for high-traffic paths

- `Product(name)`
- `Product(categoryId, isActive)` after adding active flag
- `InventoryBatch(inventoryItemId, expiresAt, status)`
- `InventoryReservation(status, expiresAt)`
- `Order(status, createdAt)`
- `Order(userId, createdAt)`
- `FulfillmentOrder(status, priority, createdAt)`
- `Delivery(status, estimatedAt)`
- `DeliveryAssignment(riderId, status)`
- `PaymentTransaction(providerReference)`
- `WebhookEvent(provider, eventId)` unique
- `AuditLog(entityType, entityId, createdAt)`

### Query rules

- avoid loading full order graphs by default
- create dedicated list DTOs and detail DTOs
- paginate admin lists
- use Prisma transactions intentionally for inventory/payment boundaries

## 19. Implementation Roadmap

### Phase 1: Operational foundations

- add Redis
- add BullMQ worker
- add structured logging
- add refresh tokens
- add audit log infrastructure
- add testing harness

### Phase 2: Inventory correctness

- introduce `InventoryItem`, `InventoryBatch`, `InventoryMovement`
- migrate product stock logic to inventory service
- implement reservation lifecycle
- implement reservation expiry release jobs

### Phase 3: Fulfillment realism

- add fulfillment state model
- picker scan flow
- substitution approval flow
- packing and staging

### Phase 4: Delivery operations

- rider model
- dispatch board
- assignment workflow
- live tracking
- dynamic fee and ETA refinement

### Phase 5: Customer experience

- search improvements
- favorites and repeat orders
- notifications
- PWA

### Phase 6: Production hardening

- observability
- CI/CD
- containerization
- staging/prod environment split

## 20. Immediate Refactor Priorities for This Codebase

Based on the current codebase, these changes should happen first:

1. Move stock mutation out of `order.service.js` product updates and into an `inventory` module with explicit reservation/commit/release methods.
2. Replace the generic `Product.stock` workflow with `InventoryItem` plus batch allocation while keeping `Product` as catalog data.
3. Split `OrderService` into `checkout`, `orders`, and `payments` responsibilities.
4. Expand Socket.IO events beyond `orders:changed` into fulfillment, payment, and delivery event namespaces.
5. Break the admin dashboard into smaller operational pages instead of one large page.
6. Replace direct picker substitution stock mutation with reservation-aware substitution logic.
7. Introduce BullMQ before adding more webhook and notification complexity.

## 21. Production-Readiness Checklist

### Application

- deterministic order and payment state transitions
- reservation expiry cleanup working
- low-stock and near-expiry alerts working
- substitution and partial fulfillment flows audited
- realtime reconnect tested

### Security

- refresh token rotation enabled
- admin 2FA enabled
- brute-force protection configured
- webhook signatures verified
- secrets stored securely

### Reliability

- failed job retry policies defined
- dead-letter handling defined
- backup and restore tested
- migration rollback plan documented

### Infrastructure

- staging environment live
- production environment live
- Redis persistence configuration reviewed
- MySQL backups scheduled
- HTTPS enabled
- Nginx websocket proxy verified

### Monitoring

- structured logs searchable
- Sentry receiving exceptions
- Prometheus scraping metrics
- Grafana dashboards built
- alerts for payment failures, low stock, and worker failures configured

## 22. Final Target Outcome

The production version of D'Cart should behave like a real neighborhood grocery operation:

- orders do not oversell stock
- batches are consumed in FIFO expiry-aware order
- staff can receive, adjust, pick, pack, stage, and dispatch accurately
- customers can approve substitutions and track delivery live
- admins can see stock risk, fulfillment bottlenecks, rider activity, and payment issues in realtime
- the codebase remains one maintainable modular monolith instead of turning into unnecessary distributed infrastructure
