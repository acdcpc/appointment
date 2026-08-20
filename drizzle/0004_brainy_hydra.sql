CREATE TABLE `audit_archive_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`retentionDays` int NOT NULL,
	`archivedCount` int NOT NULL,
	`executionType` enum('manual','scheduled') NOT NULL,
	`executedBy` varchar(255) NOT NULL,
	`reason` varchar(500) NOT NULL,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_archive_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_archive_runs_clinician_executed_idx` ON `audit_archive_runs` (`clinicianUserId`,`executedAt`);