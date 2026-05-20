CREATE TABLE "admin_notification_reads" (
    "id" SERIAL NOT NULL,
    "adminUserId" INTEGER NOT NULL,
    "notificationKey" VARCHAR(120) NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_notification_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_notification_reads_adminUserId_notificationKey_key" ON "admin_notification_reads"("adminUserId", "notificationKey");

CREATE INDEX "admin_notification_reads_adminUserId_readAt_idx" ON "admin_notification_reads"("adminUserId", "readAt");

ALTER TABLE "admin_notification_reads" ADD CONSTRAINT "admin_notification_reads_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
