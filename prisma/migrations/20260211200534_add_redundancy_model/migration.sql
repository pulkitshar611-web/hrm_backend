-- CreateTable
CREATE TABLE `redundancy` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `terminationType` VARCHAR(191) NOT NULL,
    `redundancyPay` DECIMAL(10, 2) NOT NULL,
    `noticePay` DECIMAL(10, 2) NOT NULL,
    `totalSettlement` DECIMAL(10, 2) NOT NULL,
    `yearsOfService` INTEGER NOT NULL,
    `reason` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `effectiveDate` DATETIME(3) NOT NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `processedBy` VARCHAR(191) NOT NULL,
    `notes` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `redundancy_companyId_fkey`(`companyId`),
    INDEX `redundancy_employeeId_fkey`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `redundancy` ADD CONSTRAINT `redundancy_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `redundancy` ADD CONSTRAINT `redundancy_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
