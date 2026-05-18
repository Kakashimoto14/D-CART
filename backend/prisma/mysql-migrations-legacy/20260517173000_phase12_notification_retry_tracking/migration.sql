ALTER TABLE `notification_logs`
  ADD COLUMN `retryCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lastRetriedAt` DATETIME(3) NULL;
