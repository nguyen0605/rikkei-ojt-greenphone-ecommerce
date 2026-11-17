CREATE TABLE IF NOT EXISTS `review_image` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `review_id` BIGINT NOT NULL,
  `image_url` VARCHAR(1000) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_review_image_review` (`review_id`),
  CONSTRAINT `fk_review_image_review` FOREIGN KEY (`review_id`) REFERENCES `review` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
