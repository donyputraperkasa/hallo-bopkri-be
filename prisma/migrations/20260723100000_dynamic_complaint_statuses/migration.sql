CREATE TABLE `complaint_statuses` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `color` VARCHAR(20) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_final` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `complaint_statuses_code_key`(`code`),
    INDEX `complaint_statuses_is_active_sort_order_idx`(`is_active`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `complaint_statuses`
(`id`, `code`, `name`, `description`, `color`, `sort_order`, `is_final`, `is_active`, `updated_at`)
VALUES
('00000000-0000-4000-8000-000000000001', 'NEW', 'Aduan Baru', 'Aduan telah diterima dan menunggu verifikasi.', '#3B82F6', 1, false, true, CURRENT_TIMESTAMP(3)),
('00000000-0000-4000-8000-000000000002', 'VERIFIED', 'Terverifikasi', 'Aduan telah diverifikasi oleh admin.', '#06B6D4', 2, false, true, CURRENT_TIMESTAMP(3)),
('00000000-0000-4000-8000-000000000003', 'FORWARDED', 'Diteruskan', 'Aduan telah diteruskan kepada bidang terkait.', '#8B5CF6', 3, false, true, CURRENT_TIMESTAMP(3)),
('00000000-0000-4000-8000-000000000004', 'IN_PROGRESS', 'Sedang Diproses', 'Aduan sedang ditindaklanjuti.', '#F59E0B', 4, false, true, CURRENT_TIMESTAMP(3)),
('00000000-0000-4000-8000-000000000005', 'RESOLVED', 'Selesai', 'Penanganan aduan telah selesai.', '#10B981', 5, true, true, CURRENT_TIMESTAMP(3)),
('00000000-0000-4000-8000-000000000006', 'REJECTED', 'Ditolak', 'Aduan tidak dapat ditindaklanjuti.', '#EF4444', 6, true, true, CURRENT_TIMESTAMP(3));

ALTER TABLE `complaints` ADD COLUMN `status_id` CHAR(36) NULL;
ALTER TABLE `complaint_histories` ADD COLUMN `status_id` CHAR(36) NULL;

UPDATE `complaints` AS c
JOIN `complaint_statuses` AS s ON BINARY s.`code` = BINARY CAST(c.`status` AS CHAR)
SET c.`status_id` = s.`id`;

UPDATE `complaint_histories` AS h
JOIN `complaint_statuses` AS s ON BINARY s.`code` = BINARY CAST(h.`status` AS CHAR)
SET h.`status_id` = s.`id`;

ALTER TABLE `complaints` DROP INDEX `complaints_status_created_at_idx`;
ALTER TABLE `complaints` MODIFY `status_id` CHAR(36) NOT NULL;
ALTER TABLE `complaint_histories` MODIFY `status_id` CHAR(36) NOT NULL;
ALTER TABLE `complaints` DROP COLUMN `status`;
ALTER TABLE `complaint_histories` DROP COLUMN `status`;

CREATE INDEX `complaints_status_id_created_at_idx`
ON `complaints`(`status_id`, `created_at`);
CREATE INDEX `complaint_histories_status_id_idx`
ON `complaint_histories`(`status_id`);

ALTER TABLE `complaints`
ADD CONSTRAINT `complaints_status_id_fkey`
FOREIGN KEY (`status_id`) REFERENCES `complaint_statuses`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `complaint_histories`
ADD CONSTRAINT `complaint_histories_status_id_fkey`
FOREIGN KEY (`status_id`) REFERENCES `complaint_statuses`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;
