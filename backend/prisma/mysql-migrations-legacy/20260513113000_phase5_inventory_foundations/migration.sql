CREATE TABLE `inventory_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `onHandQty` INTEGER NOT NULL DEFAULT 0,
    `reservedQty` INTEGER NOT NULL DEFAULT 0,
    `availableQty` INTEGER NOT NULL DEFAULT 0,
    `reorderPoint` INTEGER NOT NULL DEFAULT 0,
    `reorderQty` INTEGER NOT NULL DEFAULT 0,
    `safetyStockQty` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_items_productId_key`(`productId`),
    INDEX `inventory_items_availableQty_isActive_idx`(`availableQty`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryItemId` INTEGER NOT NULL,
    `batchCode` VARCHAR(100) NOT NULL,
    `supplier` VARCHAR(150) NULL,
    `receivedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `unitCost` DECIMAL(10, 2) NULL,
    `receivedQty` INTEGER NOT NULL,
    `remainingQty` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'NEAR_EXPIRY', 'EXPIRED', 'QUARANTINED', 'DEPLETED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_batches_batchCode_key`(`batchCode`),
    INDEX `inventory_batches_inventoryItemId_status_expiresAt_idx`(`inventoryItemId`, `status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory_reservations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cartSessionKey` VARCHAR(100) NULL,
    `status` ENUM('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdByUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_reservations_status_expiresAt_idx`(`status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory_reservation_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservationId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `batchId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_reservation_items_reservationId_idx`(`reservationId`),
    INDEX `inventory_reservation_items_productId_idx`(`productId`),
    INDEX `inventory_reservation_items_batchId_idx`(`batchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inventory_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `batchId` INTEGER NULL,
    `type` ENUM('RECEIVE', 'RESERVE', 'RELEASE', 'COMMIT', 'ADJUST', 'DAMAGE', 'EXPIRE', 'RETURN') NOT NULL,
    `quantityDelta` INTEGER NOT NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` VARCHAR(100) NULL,
    `reason` VARCHAR(255) NULL,
    `actorUserId` INTEGER NULL,
    `metadataJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_movements_productId_createdAt_idx`(`productId`, `createdAt`),
    INDEX `inventory_movements_batchId_createdAt_idx`(`batchId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `orders` ADD COLUMN `inventoryReservationId` INTEGER NULL;
CREATE UNIQUE INDEX `orders_inventoryReservationId_key` ON `orders`(`inventoryReservationId`);
CREATE INDEX `orders_inventoryReservationId_idx` ON `orders`(`inventoryReservationId`);

ALTER TABLE `inventory_items`
    ADD CONSTRAINT `inventory_items_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `inventory_batches`
    ADD CONSTRAINT `inventory_batches_inventoryItemId_fkey`
    FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `inventory_reservation_items`
    ADD CONSTRAINT `inventory_reservation_items_reservationId_fkey`
    FOREIGN KEY (`reservationId`) REFERENCES `inventory_reservations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `inventory_reservation_items`
    ADD CONSTRAINT `inventory_reservation_items_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `inventory_reservation_items`
    ADD CONSTRAINT `inventory_reservation_items_batchId_fkey`
    FOREIGN KEY (`batchId`) REFERENCES `inventory_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `inventory_movements`
    ADD CONSTRAINT `inventory_movements_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `inventory_movements`
    ADD CONSTRAINT `inventory_movements_batchId_fkey`
    FOREIGN KEY (`batchId`) REFERENCES `inventory_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `orders`
    ADD CONSTRAINT `orders_inventoryReservationId_fkey`
    FOREIGN KEY (`inventoryReservationId`) REFERENCES `inventory_reservations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
