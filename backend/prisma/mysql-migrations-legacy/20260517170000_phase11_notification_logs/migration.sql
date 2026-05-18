CREATE TABLE `notification_logs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `orderId` INTEGER NULL,
  `userId` INTEGER NULL,
  `channel` ENUM('EMAIL') NOT NULL,
  `templateKey` VARCHAR(100) NOT NULL,
  `recipient` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `status` ENUM('SENT', 'FAILED', 'SKIPPED') NOT NULL,
  `provider` VARCHAR(50) NOT NULL,
  `errorMessage` VARCHAR(255) NULL,
  `payloadJson` JSON NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `notification_logs_orderId_createdAt_idx`(`orderId`, `createdAt`),
  INDEX `notification_logs_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `notification_logs_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `notification_logs_templateKey_createdAt_idx`(`templateKey`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `notification_logs`
  ADD CONSTRAINT `notification_logs_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `notification_logs`
  ADD CONSTRAINT `notification_logs_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
