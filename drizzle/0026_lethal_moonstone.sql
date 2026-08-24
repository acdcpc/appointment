CREATE TABLE `super_admin_access_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` varchar(120) NOT NULL,
	`actorEmail` varchar(320) NOT NULL,
	`applicationAdminCount` int NOT NULL,
	`activeStaffCount` int NOT NULL,
	`revokedStaffCount` int NOT NULL,
	`pendingInvitationCount` int NOT NULL,
	`reviewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `super_admin_access_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `super_admin_access_review_unique` UNIQUE(`reviewId`)
);
--> statement-breakpoint
CREATE TABLE `super_admin_governance_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exportRetentionDays` int NOT NULL DEFAULT 30,
	`accessReviewIntervalDays` int NOT NULL DEFAULT 90,
	`updatedBy` varchar(320) NOT NULL,
	`lastAccessReviewAt` timestamp,
	`lastAccessReviewBy` varchar(320),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `super_admin_governance_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `super_admin_access_review_time_idx` ON `super_admin_access_reviews` (`reviewedAt`);