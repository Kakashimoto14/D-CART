CREATE TABLE `riders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `vehicleType` VARCHAR(50) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `currentLatitude` DECIMAL(10, 7) NULL,
    `currentLongitude` DECIMAL(10, 7) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `riders_userId_key`(`userId`),
    INDEX `riders_isActive_isAvailable_idx`(`isActive`, `isAvailable`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `delivery_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deliveryId` INTEGER NOT NULL,
    `riderId` INTEGER NOT NULL,
    `status` ENUM('ASSIGNED', 'PICKED_UP', 'DELIVERED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'ASSIGNED',
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pickedUpAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `delivery_assignments_deliveryId_status_idx`(`deliveryId`, `status`),
    INDEX `delivery_assignments_riderId_status_idx`(`riderId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `riders`
    ADD CONSTRAINT `riders_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `delivery_assignments`
    ADD CONSTRAINT `delivery_assignments_deliveryId_fkey`
    FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `delivery_assignments`
    ADD CONSTRAINT `delivery_assignments_riderId_fkey`
    FOREIGN KEY (`riderId`) REFERENCES `riders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
