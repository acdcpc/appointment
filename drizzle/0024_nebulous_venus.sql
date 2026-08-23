CREATE TABLE `clinic_day_hour_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`overrideId` varchar(120) NOT NULL,
	`appointmentDate` varchar(10) NOT NULL,
	`isOpen` boolean NOT NULL,
	`startTime` varchar(20),
	`endTime` varchar(20),
	`familyNotice` varchar(500) NOT NULL DEFAULT 'Clinic hours have been updated for this date. Please review your confirmed appointment and contact the clinic with questions.',
	`updatedBy` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_day_hour_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinic_day_hour_override_scope_date_unique` UNIQUE(`clinicianUserId`,`appointmentDate`),
	CONSTRAINT `clinic_day_hour_override_scope_id_unique` UNIQUE(`clinicianUserId`,`overrideId`)
);
--> statement-breakpoint
CREATE INDEX `clinic_day_hour_override_scope_date_idx` ON `clinic_day_hour_overrides` (`clinicianUserId`,`appointmentDate`);