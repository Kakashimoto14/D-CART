/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `deliveries` ADD COLUMN `deliveryFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `distanceKm` DECIMAL(10, 2) NULL,
    ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
    ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `substituteProductId` INTEGER NULL,
    ADD COLUMN `substitutionNote` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `deliveryFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `deliverySlotId` INTEGER NULL,
    ADD COLUMN `pickerId` INTEGER NULL,
    ADD COLUMN `pickerNotes` TEXT NULL,
    ADD COLUMN `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `barcode` VARCHAR(50) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `image` VARCHAR(500) NULL,
    ADD COLUMN `unit` VARCHAR(20) NOT NULL DEFAULT 'pc',
    ADD COLUMN `weight` DECIMAL(10, 3) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(20) NULL,
    MODIFY `role` ENUM('CUSTOMER', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE `delivery_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `startTime` VARCHAR(5) NOT NULL,
    `endTime` VARCHAR(5) NOT NULL,
    `maxOrders` INTEGER NOT NULL DEFAULT 5,
    `bookedCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `delivery_slots_date_startTime_endTime_key`(`date`, `startTime`, `endTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `store_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storeName` VARCHAR(191) NOT NULL DEFAULT 'Decolores Grocery Store',
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `deliveryRadius` DECIMAL(5, 1) NOT NULL DEFAULT 5.0,
    `baseFee` DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
    `perKmFee` DECIMAL(10, 2) NOT NULL DEFAULT 10.00,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `order_items_substituteProductId_idx` ON `order_items`(`substituteProductId`);

-- CreateIndex
CREATE INDEX `orders_pickerId_idx` ON `orders`(`pickerId`);

-- CreateIndex
CREATE INDEX `orders_deliverySlotId_idx` ON `orders`(`deliverySlotId`);

-- CreateIndex
CREATE UNIQUE INDEX `products_barcode_key` ON `products`(`barcode`);

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_pickerId_fkey` FOREIGN KEY (`pickerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_deliverySlotId_fkey` FOREIGN KEY (`deliverySlotId`) REFERENCES `delivery_slots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_substituteProductId_fkey` FOREIGN KEY (`substituteProductId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
