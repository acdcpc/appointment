CREATE TABLE `clinic_staff_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`staffAccountId` varchar(120) NOT NULL,
	`invitedEmail` varchar(320) NOT NULL,
	`staffUserId` int,
	`displayName` varchar(255),
	`staffRole` enum('receptionist','nurse','clinician') NOT NULL,
	`status` enum('invited','active','revoked') NOT NULL DEFAULT 'invited',
	`invitedBy` varchar(255) NOT NULL,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`activatedAt` timestamp,
	`revokedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_staff_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinic_staff_accounts_scope_account_unique` UNIQUE(`clinicianUserId`,`staffAccountId`),
	CONSTRAINT `clinic_staff_accounts_scope_email_unique` UNIQUE(`clinicianUserId`,`invitedEmail`),
	CONSTRAINT `clinic_staff_accounts_user_unique` UNIQUE(`staffUserId`)
);
--> statement-breakpoint
CREATE TABLE `weekly_capacity_summary_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`exportId` varchar(120) NOT NULL,
	`weekStartDate` varchar(10) NOT NULL,
	`weekEndDate` varchar(10) NOT NULL,
	`staffCount` int NOT NULL,
	`unacknowledgedAlertCount` int NOT NULL,
	`reviewedBy` varchar(255) NOT NULL,
	`reviewedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_capacity_summary_exports_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_capacity_summary_exports_scope_export_unique` UNIQUE(`clinicianUserId`,`exportId`)
);
--> statement-breakpoint
ALTER TABLE `print_audit_filter_presets` ADD `displayOrder` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `clinic_staff_accounts_email_status_idx` ON `clinic_staff_accounts` (`invitedEmail`,`status`);--> statement-breakpoint
CREATE INDEX `weekly_capacity_summary_exports_scope_week_idx` ON `weekly_capacity_summary_exports` (`clinicianUserId`,`weekStartDate`);