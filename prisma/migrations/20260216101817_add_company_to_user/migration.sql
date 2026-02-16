-- AlterTable
ALTER TABLE `user` ADD COLUMN `companyId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `user_companyId_fkey` ON `user`(`companyId`);

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
