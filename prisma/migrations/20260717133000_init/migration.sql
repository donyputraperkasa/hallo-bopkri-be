CREATE TABLE `admins` (
    `id` CHAR(36) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `admins_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `complaints` (
    `id` CHAR(36) NOT NULL,
    `ticket_code` VARCHAR(40) NOT NULL,
    `category` ENUM('QUESTION', 'APPRECIATION', 'COMPLAINT') NOT NULL,
    `reporter_name` VARCHAR(100) NULL,
    `contact` VARCHAR(150) NULL,
    `content` TEXT NOT NULL,
    `status` ENUM('NEW', 'VERIFIED', 'FORWARDED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'NEW',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `complaints_ticket_code_key`(`ticket_code`),
    INDEX `complaints_status_created_at_idx`(`status`, `created_at`),
    INDEX `complaints_category_created_at_idx`(`category`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `complaint_histories` (
    `id` CHAR(36) NOT NULL,
    `complaint_id` CHAR(36) NOT NULL,
    `status` ENUM('NEW', 'VERIFIED', 'FORWARDED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL,
    `public_note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `complaint_histories_complaint_id_created_at_idx`(`complaint_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `complaint_attachments` (
    `id` CHAR(36) NOT NULL,
    `complaint_id` CHAR(36) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `complaint_attachments_complaint_id_idx`(`complaint_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `complaint_histories`
ADD CONSTRAINT `complaint_histories_complaint_id_fkey`
FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `complaint_attachments`
ADD CONSTRAINT `complaint_attachments_complaint_id_fkey`
FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
