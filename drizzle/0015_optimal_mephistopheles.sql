CREATE TABLE `capacity_alert_visibility_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`dailyDashboardSummaryEnabled` boolean NOT NULL DEFAULT true,
	`receptionistVisible` boolean NOT NULL DEFAULT false,
	`nurseVisible` boolean NOT NULL DEFAULT false,
	`clinicianVisible` boolean NOT NULL DEFAULT true,
	`updatedBy` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `capacity_alert_visibility_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `capacity_alert_visibility_settings_scope_unique` UNIQUE(`clinicianUserId`)
);
--> statement-breakpoint
CREATE TABLE `print_audit_filter_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`presetId` varchar(120) NOT NULL,
	`name` varchar(80) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`actorName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `print_audit_filter_presets_id` PRIMARY KEY(`id`),
	CONSTRAINT `print_audit_filter_presets_scope_preset_unique` UNIQUE(`clinicianUserId`,`presetId`),
	CONSTRAINT `print_audit_filter_presets_scope_name_unique` UNIQUE(`clinicianUserId`,`name`)
);
