-- AlterTable
ALTER TABLE `admins` ADD COLUMN `bidang` VARCHAR(50) NULL,
    ADD COLUMN `display_name` VARCHAR(100) NULL,
    ADD COLUMN `role` ENUM('OWNER', 'DIRECTOR', 'MANAGER') NOT NULL DEFAULT 'OWNER';

-- AlterTable
ALTER TABLE `complaints` ADD COLUMN `tags` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `complaint_dispatches` (
    `id` CHAR(36) NOT NULL,
    `complaint_id` CHAR(36) NOT NULL,
    `admin_id` CHAR(36) NOT NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `complaint_dispatches_admin_id_idx`(`admin_id`),
    INDEX `complaint_dispatches_complaint_id_idx`(`complaint_id`),
    UNIQUE INDEX `complaint_dispatches_complaint_id_admin_id_key`(`complaint_id`, `admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `complaint_dispatches` ADD CONSTRAINT `complaint_dispatches_complaint_id_fkey` FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_dispatches` ADD CONSTRAINT `complaint_dispatches_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
