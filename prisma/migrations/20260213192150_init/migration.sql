-- AlterTable
ALTER TABLE `payroll` ADD COLUMN `edTax` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `nht` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `nis` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `paye` DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE `gang` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `gang_companyId_fkey`(`companyId`),
    UNIQUE INDEX `gang_name_companyId_key`(`name`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employeegang` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `gangId` VARCHAR(191) NOT NULL,

    INDEX `employeegang_employeeId_fkey`(`employeeId`),
    INDEX `employeegang_gangId_fkey`(`gangId`),
    UNIQUE INDEX `employeegang_employeeId_gangId_key`(`employeeId`, `gangId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gangshiftassignment` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `gangId` VARCHAR(191) NOT NULL,
    `shiftType` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `gangshift_employeeId_fkey`(`employeeId`),
    INDEX `gangshift_gangId_fkey`(`gangId`),
    INDEX `gangshift_companyId_fkey`(`companyId`),
    UNIQUE INDEX `gangshiftassignment_employeeId_date_key`(`employeeId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salesshare` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `totalSales` DECIMAL(15, 2) NOT NULL,
    `commissionRate` DECIMAL(5, 2) NOT NULL,
    `shareAmount` DECIMAL(15, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'GENERATED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `salesshare_companyId_fkey`(`companyId`),
    UNIQUE INDEX `salesshare_employeeId_period_key`(`employeeId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactioncode` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transactioncode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `gang` ADD CONSTRAINT `gang_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employeegang` ADD CONSTRAINT `employeegang_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employeegang` ADD CONSTRAINT `employeegang_gangId_fkey` FOREIGN KEY (`gangId`) REFERENCES `gang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gangshiftassignment` ADD CONSTRAINT `gangshiftassignment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gangshiftassignment` ADD CONSTRAINT `gangshiftassignment_gangId_fkey` FOREIGN KEY (`gangId`) REFERENCES `gang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gangshiftassignment` ADD CONSTRAINT `gangshiftassignment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salesshare` ADD CONSTRAINT `salesshare_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salesshare` ADD CONSTRAINT `salesshare_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
