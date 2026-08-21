ALTER TABLE `audit_retention_policies` ADD `monthlySummaryEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_retention_policies` ADD `monthlySummaryCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `audit_retention_policies` ADD `lastMonthlySummaryPeriod` varchar(7);--> statement-breakpoint
ALTER TABLE `audit_retention_policies` ADD `lastMonthlySummaryAt` timestamp;