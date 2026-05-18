ALTER TABLE `orders`
  ADD COLUMN `substitutionPreference` ENUM('BEST_MATCH', 'ASK_BEFORE_REPLACE', 'NO_SUBSTITUTIONS') NOT NULL DEFAULT 'BEST_MATCH' AFTER `status`,
  ADD COLUMN `refundStatus` ENUM('NONE', 'PENDING', 'NOT_REQUIRED', 'COMPLETED') NOT NULL DEFAULT 'NONE' AFTER `paymentCheckoutId`,
  ADD COLUMN `refundAmount` DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER `refundStatus`,
  ADD COLUMN `fulfillmentAdjustedAt` DATETIME(3) NULL AFTER `refundAmount`;

ALTER TABLE `order_items`
  ADD COLUMN `finalQuantity` INT NOT NULL DEFAULT 0 AFTER `pickedQty`,
  ADD COLUMN `substitutionDecision` ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NONE' AFTER `pickStatus`;

UPDATE `order_items`
SET `finalQuantity` = `quantity`
WHERE `finalQuantity` = 0;
