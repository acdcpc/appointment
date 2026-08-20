CREATE TABLE `audit_retention_policy_changes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`setting` enum('retention-days','automatic-archive') NOT NULL,
	`previousValue` varchar(120) NOT NULL,
	`nextValue` varchar(120) NOT NULL,
	`changedBy` varchar(255) NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_retention_policy_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_retention_policy_changes_clinician_changed_idx` ON `audit_retention_policy_changes` (`clinicianUserId`,`changedAt`);