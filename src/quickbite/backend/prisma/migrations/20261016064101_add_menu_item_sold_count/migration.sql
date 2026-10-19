-- AlterTable
ALTER TABLE `menu_items` ADD COLUMN `soldCount` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `menu_items_soldCount_idx` ON `menu_items`(`soldCount`);
