CREATE TABLE `audit_retention_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`retentionDays` int NOT NULL,
	`updatedBy` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audit_retention_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_retention_policies_clinician_unique` UNIQUE(`clinicianUserId`)
);
--> statement-breakpoint
ALTER TABLE `referral_audit_events` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `referral_audit_events` ADD `archivedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `referral_audit_events` ADD `archiveReason` varchar(500);