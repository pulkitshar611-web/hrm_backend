-- AlterTable
ALTER TABLE `auditlog` ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `userAgent` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `refreshtoken` ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `lastActive` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `userAgent` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `windowPreferences` JSON NULL;
