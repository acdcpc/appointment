ALTER TABLE `service_suggestion_requests` MODIFY COLUMN `status` enum('submitted','approved','dismissed') NOT NULL DEFAULT 'submitted';--> statement-breakpoint
ALTER TABLE `service_suggestion_requests` ADD `notificationEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `service_suggestion_requests` ADD `notificationConsented` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `service_suggestion_requests` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `service_suggestion_requests` ADD `reviewedBy` varchar(320);