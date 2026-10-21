-- AlterTable
ALTER TABLE `food_stalls` ADD COLUMN `bankAccountName` VARCHAR(100) NULL,
    ADD COLUMN `bankAccountNo` VARCHAR(30) NULL,
    ADD COLUMN `bankBin` VARCHAR(10) NULL;

-- AlterTable
ALTER TABLE `orders` MODIFY `paymentMethod` ENUM('CASH_ON_PICKUP', 'VIETQR') NOT NULL DEFAULT 'CASH_ON_PICKUP';

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `bankAccountName` VARCHAR(100) NULL,
    ADD COLUMN `bankAccountNo` VARCHAR(30) NULL,
    ADD COLUMN `bankBin` VARCHAR(10) NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `transferContent` VARCHAR(40) NULL,
    MODIFY `method` ENUM('CASH_ON_PICKUP', 'VIETQR') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `payments_providerRef_key` ON `payments`(`providerRef`);

-- CreateIndex
CREATE UNIQUE INDEX `payments_transferContent_key` ON `payments`(`transferContent`);

-- CreateIndex
CREATE INDEX `payments_method_status_expiresAt_idx` ON `payments`(`method`, `status`, `expiresAt`);

