CREATE TABLE `referral_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`clientEventId` varchar(80) NOT NULL,
	`childId` varchar(120) NOT NULL,
	`type` enum('appointment-change','referral-letter','email-share') NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`actorRole` enum('clinician') NOT NULL,
	`actorName` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`message` text,
	`deliveryStatus` enum('draft-opened','sent','saved','cancelled','unavailable'),
	`isResend` boolean NOT NULL DEFAULT false,
	`retryLimit` int NOT NULL DEFAULT 3,
	`retryAttempts` int NOT NULL DEFAULT 0,
	`alertSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_audit_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_audit_events_client_event_unique` UNIQUE(`clinicianUserId`,`clientEventId`)
);
--> statement-breakpoint
CREATE TABLE `referral_delivery_monitor` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thresholdHours` int NOT NULL DEFAULT 24,
	`lastRunAt` timestamp,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_delivery_monitor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_retry_counters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`childId` varchar(120) NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`attemptsUsed` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_retry_counters_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_retry_counters_scope_unique` UNIQUE(`clinicianUserId`,`childId`,`recipientEmail`)
);
--> statement-breakpoint
CREATE INDEX `referral_audit_events_child_occurred_idx` ON `referral_audit_events` (`clinicianUserId`,`childId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `referral_audit_events_delivery_alert_idx` ON `referral_audit_events` (`deliveryStatus`,`alertSentAt`,`occurredAt`);