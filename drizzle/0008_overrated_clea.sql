ALTER TABLE `audit_retention_policies` ADD `quarterlyReviewEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_retention_policies` ADD `quarterlyReviewCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `audit_retention_policies` ADD `lastQuarterlyReviewPeriod` varchar(7);--> statement-breakpoint
ALTER TABLE `audit_retention_policies` ADD `lastQuarterlyReviewAt` timestamp;