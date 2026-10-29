-- Setup Permission Groups tables
-- Use these scripts to manually setup on your server

CREATE TABLE IF NOT EXISTS `permission_groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_groups_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permission_group_has_permissions` (
  `permission_id` bigint(20) unsigned NOT NULL,
  `permission_group_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`permission_group_id`),
  KEY `pghp_group_id_foreign` (`permission_group_id`),
  CONSTRAINT `pghp_group_id_foreign` FOREIGN KEY (`permission_group_id`) REFERENCES `permission_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pghp_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
