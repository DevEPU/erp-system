-- Create User Product Groups table
CREATE TABLE IF NOT EXISTS `user_product_groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_product_groups_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create junction table for Categories
CREATE TABLE IF NOT EXISTS `user_product_group_has_categories` (
  `group_id` bigint(20) unsigned NOT NULL,
  `category_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`group_id`,`category_id`),
  KEY `upghc_category_id_foreign` (`category_id`),
  CONSTRAINT `upghc_group_id_foreign` FOREIGN KEY (`group_id`) REFERENCES `user_product_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `upghc_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create junction table for Products
CREATE TABLE IF NOT EXISTS `user_product_group_has_products` (
  `group_id` bigint(20) unsigned NOT NULL,
  `product_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`group_id`,`product_id`),
  KEY `upghp_product_id_foreign` (`product_id`),
  CONSTRAINT `upghp_group_id_foreign` FOREIGN KEY (`group_id`) REFERENCES `user_product_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `upghp_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
