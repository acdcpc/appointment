CREATE TABLE `staff_account_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`activityId` varchar(120) NOT NULL,
	`staffAccountId` varchar(120) NOT NULL,
	`eventType` enum('invitation-created','resend-prepared','activated','expired','role-changed','revoked') NOT NULL,
	`actorName` varchar(255) NOT NULL,
	`summary` varchar(500) NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_account_activity_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_account_activity_scope_activity_unique` UNIQUE(`clinicianUserId`,`activityId`)
);
--> statement-breakpoint
CREATE TABLE `staff_invitation_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`expiryDays` int NOT NULL DEFAULT 7,
	`updatedBy` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_invitation_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_invitation_settings_scope_unique` UNIQUE(`clinicianUserId`)
);
--> statement-breakpoint
ALTER TABLE `clinic_staff_accounts` MODIFY COLUMN `status` enum('invited','active','revoked','expired') NOT NULL DEFAULT 'invited';--> statement-breakpoint
ALTER TABLE `clinic_staff_accounts` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `clinic_staff_accounts` ADD `resendPreparedAt` timestamp;--> statement-breakpoint
ALTER TABLE `clinic_staff_accounts` ADD `resendCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `weekly_capacity_summary_exports` ADD `exportFormat` enum('csv','pdf') DEFAULT 'csv' NOT NULL;--> statement-breakpoint
CREATE INDEX `staff_account_activity_scope_occurred_idx` ON `staff_account_activity` (`clinicianUserId`,`occurredAt`);