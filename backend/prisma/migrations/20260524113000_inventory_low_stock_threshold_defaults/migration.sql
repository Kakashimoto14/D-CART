ALTER TABLE "inventory_items"
ALTER COLUMN "reorderPoint" SET DEFAULT 5;

UPDATE "inventory_items"
SET "reorderPoint" = 5
WHERE "reorderPoint" = 0;
