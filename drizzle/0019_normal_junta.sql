CREATE TABLE `invitation_search_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`presetId` varchar(120) NOT NULL,
	`name` varchar(80) NOT NULL,
	`searchText` varchar(160) NOT NULL DEFAULT '',
	`statusFilter` enum('all','invited','active','expired','revoked') NOT NULL DEFAULT 'all',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invitation_search_presets_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitation_search_presets_scope_preset_unique` UNIQUE(`clinicianUserId`,`presetId`),
	CONSTRAINT `invitation_search_presets_scope_name_unique` UNIQUE(`clinicianUserId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `weekly_capacity_report_reference_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`expiryDays` int NOT NULL DEFAULT 30,
	`updatedBy` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_capacity_report_reference_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_capacity_report_reference_settings_scope_unique` UNIQUE(`clinicianUserId`)
);
--> statement-breakpoint
ALTER TABLE `weekly_capacity_summary_exports` ADD `referenceExpiresAt` timestamp;