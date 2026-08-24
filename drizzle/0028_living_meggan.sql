ALTER TABLE `post_deployment_feedback` ADD `screenshotStorageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `post_deployment_feedback` ADD `screenshotContentType` varchar(80);--> statement-breakpoint
ALTER TABLE `post_deployment_feedback` ADD `screenshotBytes` int;--> statement-breakpoint
ALTER TABLE `super_admin_governance_settings` ADD `maintenanceEstimatedCompletion` varchar(160);--> statement-breakpoint
ALTER TABLE `super_admin_maintenance_events` ADD `estimatedCompletion` varchar(160);