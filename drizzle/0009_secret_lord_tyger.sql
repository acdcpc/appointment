CREATE TABLE `clinic_public_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicName` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`mapUrl` varchar(2048) NOT NULL,
	`whatsappNumber` varchar(20) NOT NULL,
	`isProvisional` boolean NOT NULL DEFAULT true,
	`updatedBy` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_public_settings_id` PRIMARY KEY(`id`)
);
