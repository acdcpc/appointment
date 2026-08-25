CREATE TABLE `maintenance_notification_preference_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exportId` varchar(120) NOT NULL,
	`actorEmail` varchar(320) NOT NULL,
	`statusFilter` varchar(20) NOT NULL,
	`emailQuery` varchar(160),
	`recordCount` int NOT NULL DEFAULT 0,
	`preparedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_notification_preference_exports_id` PRIMARY KEY(`id`),
	CONSTRAINT `maintenance_notification_preference_export_unique` UNIQUE(`exportId`)
);
--> statement-breakpoint
CREATE INDEX `maintenance_notification_preference_export_time_idx` ON `maintenance_notification_preference_exports` (`preparedAt`);