ALTER TABLE `orders`
  ADD COLUMN `paymentMethod` ENUM('COD', 'GCASH') NOT NULL DEFAULT 'COD',
  ADD COLUMN `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `paymentProvider` VARCHAR(50) NULL,
  ADD COLUMN `paymentReference` VARCHAR(100) NULL,
  ADD COLUMN `paymentCheckoutId` VARCHAR(100) NULL,
  ADD COLUMN `paidAt` DATETIME(3) NULL;

CREATE INDEX `orders_paymentCheckoutId_idx` ON `orders`(`paymentCheckoutId`);
