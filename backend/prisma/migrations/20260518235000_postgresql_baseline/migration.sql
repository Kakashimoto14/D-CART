-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SCHEDULED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryAssignmentStatus" AS ENUM ('ASSIGNED', 'PICKED_UP', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('STANDARD', 'SAME_DAY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'GCASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InventoryBatchStatus" AS ENUM ('ACTIVE', 'NEAR_EXPIRY', 'EXPIRED', 'QUARANTINED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIVE', 'RESERVE', 'RELEASE', 'COMMIT', 'ADJUST', 'DAMAGE', 'EXPIRE', 'RETURN');

-- CreateEnum
CREATE TYPE "PickStatus" AS ENUM ('PENDING', 'PICKED', 'PARTIAL', 'UNAVAILABLE', 'SUBSTITUTED');

-- CreateEnum
CREATE TYPE "SubstitutionPreference" AS ENUM ('BEST_MATCH', 'ASK_BEFORE_REPLACE', 'NO_SUBSTITUTIONS');

-- CreateEnum
CREATE TYPE "SubstitutionDecision" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'PENDING', 'NOT_REQUIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "passwordResetToken" VARCHAR(64),
    "passwordResetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" VARCHAR(500),
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'pc',
    "weight" DECIMAL(10,3),
    "barcode" VARCHAR(50),
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "cartId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "substitutionPreference" "SubstitutionPreference" NOT NULL DEFAULT 'BEST_MATCH',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentProvider" VARCHAR(50),
    "paymentReference" VARCHAR(100),
    "paymentCheckoutId" VARCHAR(100),
    "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
    "refundAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fulfillmentAdjustedAt" TIMESTAMP(3),
    "inventoryReservationId" INTEGER,
    "paidAt" TIMESTAMP(3),
    "pickerId" INTEGER,
    "pickerNotes" TEXT,
    "packedAt" TIMESTAMP(3),
    "packedByUserId" INTEGER,
    "stagingLabel" VARCHAR(100),
    "stagingZone" VARCHAR(100),
    "readyForDispatchAt" TIMESTAMP(3),
    "deliverySlotId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "pickedQty" INTEGER NOT NULL DEFAULT 0,
    "finalQuantity" INTEGER NOT NULL DEFAULT 0,
    "pickStatus" "PickStatus" NOT NULL DEFAULT 'PENDING',
    "substitutionDecision" "SubstitutionDecision" NOT NULL DEFAULT 'NONE',
    "pickedAt" TIMESTAMP(3),
    "pickedByUserId" INTEGER,
    "scannedBarcode" VARCHAR(50),
    "pickIssueNote" VARCHAR(255),
    "substituteProductId" INTEGER,
    "substitutionNote" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "distanceKm" DECIMAL(10,2),
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "type" "DeliveryType" NOT NULL DEFAULT 'SAME_DAY',
    "estimatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_slots" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "maxOrders" INTEGER NOT NULL DEFAULT 5,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_config" (
    "id" SERIAL NOT NULL,
    "storeName" TEXT NOT NULL DEFAULT 'Decolores Grocery Store',
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "deliveryRadius" DECIMAL(5,1) NOT NULL DEFAULT 5.0,
    "baseFee" DECIMAL(10,2) NOT NULL DEFAULT 30.00,
    "perKmFee" DECIMAL(10,2) NOT NULL DEFAULT 10.00,

    CONSTRAINT "store_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "deviceInfo" VARCHAR(255),
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actorUserId" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(100),
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "ipAddress" VARCHAR(64),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "onHandQty" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "reorderQty" INTEGER NOT NULL DEFAULT 0,
    "safetyStockQty" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" SERIAL NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "batchCode" VARCHAR(100) NOT NULL,
    "supplier" VARCHAR(150),
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "unitCost" DECIMAL(10,2),
    "receivedQty" INTEGER NOT NULL,
    "remainingQty" INTEGER NOT NULL,
    "status" "InventoryBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" SERIAL NOT NULL,
    "cartSessionKey" VARCHAR(100),
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservation_items" (
    "id" SERIAL NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "batchId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "type" "InventoryMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "referenceType" VARCHAR(50),
    "referenceId" VARCHAR(100),
    "reason" VARCHAR(255),
    "actorUserId" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riders" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vehicleType" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "currentLatitude" DECIMAL(10,7),
    "currentLongitude" DECIMAL(10,7),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "riders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_assignments" (
    "id" SERIAL NOT NULL,
    "deliveryId" INTEGER NOT NULL,
    "riderId" INTEGER NOT NULL,
    "status" "DeliveryAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "recipientName" VARCHAR(100),
    "proofNote" VARCHAR(255),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER,
    "userId" INTEGER,
    "channel" "NotificationChannel" NOT NULL,
    "templateKey" VARCHAR(100) NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetriedAt" TIMESTAMP(3),
    "errorMessage" VARCHAR(255),
    "payloadJson" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_key" ON "cart_items"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_inventoryReservationId_key" ON "orders"("inventoryReservationId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_pickerId_idx" ON "orders"("pickerId");

-- CreateIndex
CREATE INDEX "orders_deliverySlotId_idx" ON "orders"("deliverySlotId");

-- CreateIndex
CREATE INDEX "orders_paymentCheckoutId_idx" ON "orders"("paymentCheckoutId");

-- CreateIndex
CREATE INDEX "orders_inventoryReservationId_idx" ON "orders"("inventoryReservationId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_substituteProductId_idx" ON "order_items"("substituteProductId");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_orderId_key" ON "deliveries"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_slots_date_startTime_endTime_key" ON "delivery_slots"("date", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_expiresAt_idx" ON "refresh_tokens"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_revokedAt_idx" ON "refresh_tokens"("revokedAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_productId_key" ON "inventory_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_items_availableQty_isActive_idx" ON "inventory_items"("availableQty", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_batches_batchCode_key" ON "inventory_batches"("batchCode");

-- CreateIndex
CREATE INDEX "inventory_batches_inventoryItemId_status_expiresAt_idx" ON "inventory_batches"("inventoryItemId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "inventory_reservations_status_expiresAt_idx" ON "inventory_reservations"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "inventory_reservation_items_reservationId_idx" ON "inventory_reservation_items"("reservationId");

-- CreateIndex
CREATE INDEX "inventory_reservation_items_productId_idx" ON "inventory_reservation_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_reservation_items_batchId_idx" ON "inventory_reservation_items"("batchId");

-- CreateIndex
CREATE INDEX "inventory_movements_productId_createdAt_idx" ON "inventory_movements"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_batchId_createdAt_idx" ON "inventory_movements"("batchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "riders_userId_key" ON "riders"("userId");

-- CreateIndex
CREATE INDEX "riders_isActive_isAvailable_idx" ON "riders"("isActive", "isAvailable");

-- CreateIndex
CREATE INDEX "delivery_assignments_deliveryId_status_idx" ON "delivery_assignments"("deliveryId", "status");

-- CreateIndex
CREATE INDEX "delivery_assignments_riderId_status_idx" ON "delivery_assignments"("riderId", "status");

-- CreateIndex
CREATE INDEX "notification_logs_orderId_createdAt_idx" ON "notification_logs"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_userId_createdAt_idx" ON "notification_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_status_createdAt_idx" ON "notification_logs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_templateKey_createdAt_idx" ON "notification_logs"("templateKey", "createdAt");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickerId_fkey" FOREIGN KEY ("pickerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliverySlotId_fkey" FOREIGN KEY ("deliverySlotId") REFERENCES "delivery_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_inventoryReservationId_fkey" FOREIGN KEY ("inventoryReservationId") REFERENCES "inventory_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_substituteProductId_fkey" FOREIGN KEY ("substituteProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_items" ADD CONSTRAINT "inventory_reservation_items_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "inventory_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_items" ADD CONSTRAINT "inventory_reservation_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_items" ADD CONSTRAINT "inventory_reservation_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

