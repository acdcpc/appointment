CREATE TABLE `clinic_appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`appointmentId` varchar(120) NOT NULL,
	`childId` varchar(120) NOT NULL,
	`service` varchar(160) NOT NULL,
	`appointmentDate` varchar(40) NOT NULL,
	`appointmentTime` varchar(20) NOT NULL,
	`durationMinutes` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('confirmed','needs-intake','completed','cancelled') NOT NULL,
	`changeMessage` text,
	`guardianConfirmedAt` timestamp,
	`rescheduledAt` timestamp,
	`rescheduleAcknowledgedAt` timestamp,
	`appointmentChangeReminderDraftedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_appointments_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinic_appointments_scope_appointment_unique` UNIQUE(`clinicianUserId`,`appointmentId`)
);
--> statement-breakpoint
CREATE INDEX `clinic_appointments_scope_schedule_idx` ON `clinic_appointments` (`clinicianUserId`,`appointmentDate`,`appointmentTime`);--> statement-breakpoint
CREATE INDEX `clinic_appointments_scope_child_idx` ON `clinic_appointments` (`clinicianUserId`,`childId`);