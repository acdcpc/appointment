CREATE TABLE `super_admin_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(120) NOT NULL,
	`eventType` enum('user-access-updated','appointment-csv-prepared') NOT NULL,
	`actorEmail` varchar(320) NOT NULL,
	`targetUserId` int,
	`targetEmail` varchar(320),
	`previousAccess` varchar(40),
	`nextAccess` varchar(40),
	`startDate` varchar(10),
	`endDate` varchar(10),
	`recordCount` int NOT NULL DEFAULT 0,
	`summary` varchar(500) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `super_admin_audit_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `super_admin_audit_event_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE INDEX `super_admin_audit_type_occurred_idx` ON `super_admin_audit_events` (`eventType`,`occurredAt`);