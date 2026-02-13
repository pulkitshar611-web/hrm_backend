-- DropForeignKey
ALTER TABLE `cheque` DROP FOREIGN KEY `cheque_employeeId_fkey`;

-- AlterTable
ALTER TABLE `cheque` MODIFY `employeeId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `cheque` ADD CONSTRAINT `cheque_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
