CREATE TABLE `post_deployment_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feedbackId` varchar(120) NOT NULL,
	`submittedBy` varchar(320) NOT NULL,
	`category` enum('login','scheduling','records','display','other') NOT NULL,
	`title` varchar(140) NOT NULL,
	`description` varchar(1200) NOT NULL,
	`status` enum('open','reviewed','resolved') NOT NULL DEFAULT 'open',
	`reviewedBy` varchar(320),
	`reviewedAt` timestamp,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_deployment_feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `post_deployment_feedback_unique` UNIQUE(`feedbackId`)
);
--> statement-breakpoint
CREATE TABLE `super_admin_maintenance_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(120) NOT NULL,
	`actorEmail` varchar(320) NOT NULL,
	`enabled` boolean NOT NULL,
	`noticeSummary` varchar(300) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `super_admin_maintenance_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `super_admin_maintenance_event_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
ALTER TABLE `super_admin_governance_settings` ADD `maintenanceModeEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `super_admin_governance_settings` ADD `maintenanceNotice` varchar(300) DEFAULT 'A scheduled clinic service update is in progress. Please return shortly.' NOT NULL;--> statement-breakpoint
ALTER TABLE `super_admin_governance_settings` ADD `maintenanceChangedAt` timestamp;--> statement-breakpoint
ALTER TABLE `super_admin_governance_settings` ADD `maintenanceChangedBy` varchar(320);--> statement-breakpoint
CREATE INDEX `post_deployment_feedback_status_time_idx` ON `post_deployment_feedback` (`status`,`submittedAt`);--> statement-breakpoint
CREATE INDEX `super_admin_maintenance_event_time_idx` ON `super_admin_maintenance_events` (`occurredAt`);