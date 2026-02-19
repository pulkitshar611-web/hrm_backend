-- AlterTable
ALTER TABLE `company` ADD COLUMN `addressLine2` VARCHAR(191) NULL,
    ADD COLUMN `mailingAddress1` VARCHAR(191) NULL,
    ADD COLUMN `mailingAddress2` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `beneficiary` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'JMD',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `includeInExport` BOOLEAN NOT NULL DEFAULT true,
    `remitTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `beneficiary_companyId_fkey`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `beneficiary` ADD CONSTRAINT `beneficiary_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
