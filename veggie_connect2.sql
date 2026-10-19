-- =========================================================================
-- VeggieConnect 2: Direct Agricultural Marketplace & Supermarket Store
-- Complete XAMPP MySQL / MariaDB Database Export
-- Database Name: veggie_connect2
-- Target Platform: XAMPP (Apache + MySQL / MariaDB + phpMyAdmin)
-- Host: localhost:3306 | User: root | Password: (blank by default)
-- Location: Dumaguete City, Negros Oriental, Philippines
-- Currency: Philippine Peso (PHP / ₱)
-- Seller (Supermarket) Model:
--   - Farmers post harvest lots at farm-gate asking prices.
--   - App Owner (Seller) buys from farmers and stocks/resells to buyers.
--   - Farmers NEVER see Buyers; Buyers NEVER see Farmers.
--   - Seller manages pricing, inventory, DA price comparison, and deliveries.
-- =========================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+08:00";

-- --------------------------------------------------------
-- Database Creation: veggie_connect2
-- --------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `veggie_connect2` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `veggie_connect2`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `direct_messages`;
DROP TABLE IF EXISTS `transport_jobs`;
DROP TABLE IF EXISTS `procurement_deals`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `da_price_bulletin`;
DROP TABLE IF EXISTS `users`;

-- --------------------------------------------------------
-- Table structure for `users`
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL DEFAULT '8f94e6b12a:1849a9fb92a',
  `phone` VARCHAR(50) NOT NULL,
  `role` ENUM('farmer', 'buyer', 'admin') NOT NULL,
  `location` VARCHAR(200) NOT NULL,
  `latitude` DOUBLE DEFAULT NULL,
  `longitude` DOUBLE DEFAULT NULL,
  `farm_name` VARCHAR(150) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'active',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `products` (Seller Supermarket Inventory & Farmer Harvest Submissions)
-- --------------------------------------------------------
CREATE TABLE `products` (
  `id` VARCHAR(64) NOT NULL,
  `farmer_id` VARCHAR(64) NOT NULL,
  `farmer_name` VARCHAR(120) NOT NULL,
  `farm_name` VARCHAR(150) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(60) NOT NULL,
  `variety` VARCHAR(100) DEFAULT NULL,
  `farmgate_asking_price` DECIMAL(10,2) DEFAULT NULL,
  `price_per_unit` DECIMAL(10,2) NOT NULL,
  `unit` VARCHAR(30) NOT NULL DEFAULT 'kg',
  `stock_quantity` INT(11) NOT NULL DEFAULT 0,
  `min_order_quantity` INT(11) NOT NULL DEFAULT 1,
  `harvest_status` VARCHAR(60) NOT NULL DEFAULT 'Harvested Today',
  `harvest_date` VARCHAR(100) NOT NULL,
  `farming_method` VARCHAR(60) NOT NULL DEFAULT 'Naturally Grown',
  `image_url` TEXT DEFAULT NULL,
  `is_organic` TINYINT(1) DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `sourcing_region` VARCHAR(150) DEFAULT NULL,
  `location` VARCHAR(150) NOT NULL,
  `latitude` DOUBLE DEFAULT NULL,
  `longitude` DOUBLE DEFAULT NULL,
  `distance_km` DECIMAL(5,2) DEFAULT 3.50,
  `rating` DECIMAL(3,2) DEFAULT 5.00,
  `reviews_count` INT(11) DEFAULT 0,
  `seller_status` ENUM('submitted', 'bought_and_stocked', 'sold_out', 'archived') NOT NULL DEFAULT 'bought_and_stocked',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmer` (`farmer_id`),
  KEY `idx_seller_status` (`seller_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `orders` (Customer Supermarket Orders)
-- --------------------------------------------------------
CREATE TABLE `orders` (
  `id` VARCHAR(64) NOT NULL,
  `buyer_id` VARCHAR(64) DEFAULT NULL,
  `buyer_name` VARCHAR(120) NOT NULL,
  `buyer_phone` VARCHAR(50) NOT NULL,
  `seller_store_name` VARCHAR(150) NOT NULL DEFAULT 'VeggieConnect Supermarket',
  `delivery_type` ENUM('farm_pickup', 'direct_delivery') NOT NULL DEFAULT 'direct_delivery',
  `delivery_address` TEXT DEFAULT NULL,
  `pickup_slot` VARCHAR(150) DEFAULT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `delivery_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(100) NOT NULL,
  `status` ENUM('pending', 'confirmed', 'harvesting_packing', 'ready_for_pickup_delivery', 'picked_up', 'in_transit', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `farmer_id` VARCHAR(64) NOT NULL,
  `farm_name` VARCHAR(150) NOT NULL,
  `farmgate_cost_total` DECIMAL(10,2) DEFAULT 0.00,
  `seller_margin` DECIMAL(10,2) DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `transporter_id` VARCHAR(64) DEFAULT NULL,
  `transporter_name` VARCHAR(120) DEFAULT NULL,
  `transporter_phone` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_buyer` (`buyer_id`),
  KEY `idx_farmer_order` (`farmer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `procurement_deals` (Admin Buying Records from Farmers)
-- --------------------------------------------------------
CREATE TABLE `procurement_deals` (
  `id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `farmer_id` VARCHAR(64) NOT NULL,
  `farmer_name` VARCHAR(120) NOT NULL,
  `produce_name` VARCHAR(150) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL,
  `unit` VARCHAR(30) NOT NULL DEFAULT 'kg',
  `farmgate_unit_price` DECIMAL(10,2) NOT NULL,
  `total_cost` DECIMAL(10,2) NOT NULL,
  `payment_status` ENUM('unpaid', 'paid_to_farmer', 'settled') NOT NULL DEFAULT 'settled',
  `status` ENUM('requested', 'procured', 'stored_at_hub', 'dispatched') NOT NULL DEFAULT 'procured',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `transport_jobs`
-- --------------------------------------------------------
CREATE TABLE `transport_jobs` (
  `id` VARCHAR(64) NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `job_type` ENUM('farm_to_hub', 'hub_to_buyer') NOT NULL DEFAULT 'hub_to_buyer',
  `pickup_farm` VARCHAR(150) NOT NULL,
  `pickup_location` VARCHAR(200) NOT NULL,
  `dropoff_location` VARCHAR(200) NOT NULL,
  `buyer_name` VARCHAR(120) NOT NULL,
  `buyer_phone` VARCHAR(50) NOT NULL,
  `items_summary` TEXT NOT NULL,
  `weight_kg_est` DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  `earnings_peso` DECIMAL(10,2) NOT NULL,
  `status` ENUM('available', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled') NOT NULL DEFAULT 'available',
  `assigned_transporter_id` VARCHAR(64) DEFAULT NULL,
  `assigned_transporter_name` VARCHAR(120) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `direct_messages` (Segregated Seller Chat)
-- --------------------------------------------------------
CREATE TABLE `direct_messages` (
  `id` VARCHAR(64) NOT NULL,
  `sender_id` VARCHAR(64) NOT NULL,
  `sender_name` VARCHAR(120) NOT NULL,
  `sender_role` ENUM('farmer', 'buyer', 'admin') NOT NULL,
  `recipient_id` VARCHAR(64) NOT NULL,
  `recipient_name` VARCHAR(120) NOT NULL,
  `recipient_role` ENUM('farmer', 'buyer', 'admin') NOT NULL,
  `text` TEXT NOT NULL,
  `produce_name` VARCHAR(150) DEFAULT NULL,
  `order_id` VARCHAR(64) DEFAULT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_pair` (`sender_id`, `recipient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `da_price_bulletin` (DA Bantay Presyo Master Data)
-- --------------------------------------------------------
CREATE TABLE `da_price_bulletin` (
  `id` VARCHAR(64) NOT NULL,
  `commodity` VARCHAR(150) NOT NULL,
  `local_name` VARCHAR(150) DEFAULT NULL,
  `variety` VARCHAR(100) DEFAULT NULL,
  `category` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(30) NOT NULL DEFAULT 'kg',
  `prevailing_retail_price` DECIMAL(10,2) NOT NULL,
  `prevailing_farmgate_price` DECIMAL(10,2) NOT NULL,
  `price_range_min` DECIMAL(10,2) NOT NULL,
  `price_range_max` DECIMAL(10,2) NOT NULL,
  `trend` ENUM('up', 'down', 'stable') NOT NULL DEFAULT 'stable',
  `change_amount` DECIMAL(10,2) DEFAULT 0.00,
  `market_center` VARCHAR(150) NOT NULL DEFAULT 'Dumaguete Public Market',
  `updated_date` VARCHAR(100) NOT NULL DEFAULT 'Today',
  `source` VARCHAR(150) NOT NULL DEFAULT 'DA AMAS Daily Price Bulletin',
  `suggested_direct_price` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Initial Seed Data: Default Admin User (The Seller)
-- Password: set ADMIN_PASSWORD in the .env file (not stored here)
-- --------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `phone`, `role`, `location`, `farm_name`, `avatar_url`, `status`, `is_verified`) VALUES
('admin-main', 'VeggieConnect Seller Desk', 'admin@gmail.com', '8f94e6b12a:1849a9fb92a', '+63 900 000 0000', 'admin', 'Dumaguete City Proper (Central Supermarket Depot)', NULL, '', 'active', 1);

-- --------------------------------------------------------
-- DA Bantay Presyo Reference Seed Data
-- --------------------------------------------------------
INSERT INTO `da_price_bulletin` (`id`, `commodity`, `local_name`, `variety`, `category`, `unit`, `prevailing_retail_price`, `prevailing_farmgate_price`, `price_range_min`, `price_range_max`, `trend`, `change_amount`, `market_center`, `suggested_direct_price`) VALUES
('da-ampalaya', 'Ampalaya (Bitter Gourd)', 'Parya / Bitter Melon', 'Native Dark Green', 'Lowland Vegetables', 'kg', 80.00, 48.00, 70.00, 90.00, 'up', 5.00, 'Dumaguete Public Market', 65.00),
('da-eggplant', 'Eggplant (Talong)', 'Talong Puti / Long Purple', 'Dumaguete Native Long', 'Lowland Vegetables', 'kg', 60.00, 35.00, 50.00, 70.00, 'stable', 0.00, 'Dumaguete Public Market', 48.00),
('da-tomato', 'Tomato (Kamatis)', 'Kamatis Native', 'Valencia Saladette / Native Round', 'Lowland Vegetables', 'kg', 55.00, 32.00, 45.00, 65.00, 'down', -5.00, 'Dumaguete Public Market', 45.00),
('da-cabbage', 'Cabbage (Repolyo)', 'Repolyo / Head Cabbage', 'Wonderball / Scorpio', 'Highland Vegetables', 'kg', 75.00, 45.00, 65.00, 90.00, 'up', 5.00, 'Dumaguete Public Market', 60.00),
('da-carrots', 'Carrots', 'Karot / Orange Crunch', 'Kuroda / Highland Sweet', 'Highland Vegetables', 'kg', 70.00, 42.00, 60.00, 80.00, 'stable', 0.00, 'Dumaguete Public Market', 56.00),
('da-bell-pepper-green', 'Bell Pepper (Green)', 'Atsal Green / Sweet Pepper', 'California Wonder', 'Highland Vegetables', 'kg', 120.00, 70.00, 100.00, 140.00, 'up', 10.00, 'Dumaguete Public Market', 95.00),
('da-bell-pepper-red', 'Bell Pepper (Red / Yellow)', 'Atsal Pula / Sweet Red', 'Red Beauty', 'Highland Vegetables', 'kg', 160.00, 95.00, 140.00, 180.00, 'up', 10.00, 'Dumaguete Public Market', 130.00),
('da-onion-red', 'Red Onion (Sibuyas Pula)', 'Sibuyas Pula / Red Creole', 'Medium Bulb', 'Spices & Aromatics', 'kg', 140.00, 85.00, 120.00, 160.00, 'up', 10.00, 'Dumaguete Public Market', 115.00),
('da-garlic-native', 'Garlic Native (Bawang)', 'Bawang Native Ilocos / Negros', 'Native Small Bulb', 'Spices & Aromatics', 'kg', 180.00, 110.00, 160.00, 200.00, 'stable', 0.00, 'Dumaguete Public Market', 150.00),
('da-ginger', 'Ginger (Luya)', 'Luya / Hawaiian Ginger', 'Native / Hawaiian', 'Spices & Aromatics', 'kg', 110.00, 65.00, 90.00, 130.00, 'up', 5.00, 'Dumaguete Public Market', 88.00),
('da-chili-labuyo', 'Chili Labuyo (Siling Labuyo)', 'Siling Labuyo / Hot Chili', 'Wild Native Birdseye', 'Spices & Aromatics', 'kg', 240.00, 150.00, 200.00, 280.00, 'up', 20.00, 'Dumaguete Public Market', 195.00);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
