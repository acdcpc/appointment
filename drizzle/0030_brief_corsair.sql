CREATE TABLE `maintenance_notification_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` varchar(120) NOT NULL,
	`maintenanceChangedAt` timestamp NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('requested','withdrawn') NOT NULL DEFAULT 'requested',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_notification_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `maintenance_notification_request_unique` UNIQUE(`maintenanceChangedAt`,`email`),
	CONSTRAINT `maintenance_notification_request_id_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE INDEX `maintenance_notification_request_status_idx` ON `maintenance_notification_requests` (`status`,`requestedAt`);