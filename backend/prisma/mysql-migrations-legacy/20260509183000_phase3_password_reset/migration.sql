ALTER TABLE `users`
  ADD COLUMN `passwordResetToken` VARCHAR(64) NULL,
  ADD COLUMN `passwordResetExpiresAt` DATETIME(3) NULL;
