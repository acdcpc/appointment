ALTER TABLE `audit_retention_policies` ADD `automaticArchiveEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_retention_policies` ADD `archiveScheduleCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `audit_retention_policies` ADD `lastArchiveRunAt` timestamp;--> statement-breakpoint
ALTER TABLE `audit_retention_policies` ADD `lastArchiveCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `referral_delivery_monitor` ADD `scheduleEnabled` boolean DEFAULT false NOT NULL;