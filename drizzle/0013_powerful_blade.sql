CREATE TABLE `internal_follow_up_print_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`auditId` varchar(120) NOT NULL,
	`documentScope` enum('appointment-change-follow-up') NOT NULL,
	`itemCount` int NOT NULL,
	`actorName` varchar(255) NOT NULL,
	`initiatedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `internal_follow_up_print_audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `internal_follow_up_print_audits_scope_audit_unique` UNIQUE(`clinicianUserId`,`auditId`)
);
--> statement-breakpoint
CREATE TABLE `staff_capacity_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`snapshotId` varchar(120) NOT NULL,
	`staffId` varchar(120) NOT NULL,
	`staffName` varchar(255) NOT NULL,
	`triageCapacity` int NOT NULL,
	`effectiveAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_capacity_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_capacity_snapshots_scope_snapshot_unique` UNIQUE(`clinicianUserId`,`snapshotId`)
);
--> statement-breakpoint
CREATE TABLE `waitlist_event_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`eventId` varchar(120) NOT NULL,
	`requestId` varchar(120) NOT NULL,
	`eventType` enum('requested','reviewed','withdrawn','offer-created','parent-response','expired','converted','assignment-changed','response-acknowledged') NOT NULL,
	`actor` enum('clinician','guardian','system') NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`status` enum('pending','reviewed','declined','withdrawn','offered','responded','expired','converted') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waitlist_event_log_id` PRIMARY KEY(`id`),
	CONSTRAINT `waitlist_event_log_scope_event_unique` UNIQUE(`clinicianUserId`,`eventId`)
);
--> statement-breakpoint
CREATE TABLE `waitlist_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`requestId` varchar(120) NOT NULL,
	`appointmentId` varchar(120) NOT NULL,
	`childId` varchar(120) NOT NULL,
	`requestedAt` timestamp NOT NULL,
	`status` enum('pending','reviewed','declined','withdrawn','offered','responded','expired','converted') NOT NULL,
	`note` text,
	`offerDate` varchar(40),
	`offerTime` varchar(20),
	`offeredAt` timestamp,
	`offerExpiresAt` timestamp,
	`parentResponse` enum('accepted','declined'),
	`respondedAt` timestamp,
	`clinicianAcknowledgedAt` timestamp,
	`convertedAt` timestamp,
	`convertedBy` varchar(255),
	`assignedStaffId` varchar(120),
	`assignedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waitlist_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `waitlist_requests_scope_request_unique` UNIQUE(`clinicianUserId`,`requestId`)
);
--> statement-breakpoint
CREATE INDEX `internal_follow_up_print_audits_scope_initiated_idx` ON `internal_follow_up_print_audits` (`clinicianUserId`,`initiatedAt`);--> statement-breakpoint
CREATE INDEX `staff_capacity_snapshots_scope_staff_effective_idx` ON `staff_capacity_snapshots` (`clinicianUserId`,`staffId`,`effectiveAt`);--> statement-breakpoint
CREATE INDEX `waitlist_event_log_scope_request_occurred_idx` ON `waitlist_event_log` (`clinicianUserId`,`requestId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `waitlist_requests_scope_offered_idx` ON `waitlist_requests` (`clinicianUserId`,`offeredAt`);--> statement-breakpoint
CREATE INDEX `waitlist_requests_scope_assigned_idx` ON `waitlist_requests` (`clinicianUserId`,`assignedAt`);