CREATE TABLE `capacity_target_change_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`alertId` varchar(120) NOT NULL,
	`staffId` varchar(120) NOT NULL,
	`staffName` varchar(255) NOT NULL,
	`previousTarget` int NOT NULL,
	`newTarget` int NOT NULL,
	`changedBy` varchar(255) NOT NULL,
	`changedAt` timestamp NOT NULL,
	`acknowledgedAt` timestamp,
	`acknowledgedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capacity_target_change_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `capacity_target_change_alerts_scope_alert_unique` UNIQUE(`clinicianUserId`,`alertId`)
);
--> statement-breakpoint
CREATE INDEX `capacity_target_change_alerts_scope_changed_idx` ON `capacity_target_change_alerts` (`clinicianUserId`,`changedAt`);--> statement-breakpoint
CREATE INDEX `capacity_target_change_alerts_scope_acknowledged_idx` ON `capacity_target_change_alerts` (`clinicianUserId`,`acknowledgedAt`);