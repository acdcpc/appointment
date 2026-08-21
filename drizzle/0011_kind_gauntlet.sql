CREATE TABLE `guardian_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`childId` varchar(120) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`relationship` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('pending','confirmed') NOT NULL DEFAULT 'pending',
	`confirmedBy` varchar(255),
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guardian_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardian_contacts_scope_email_unique` UNIQUE(`clinicianUserId`,`childId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `patient_report_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`childId` varchar(120) NOT NULL,
	`guardianContactId` int NOT NULL,
	`scope` enum('record-pdf','timeline-report') NOT NULL,
	`acknowledgementToken` varchar(96) NOT NULL,
	`deliveryStatus` enum('draft-opened','sent','saved','cancelled','unavailable') NOT NULL DEFAULT 'draft-opened',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedAt` timestamp,
	`acknowledgementText` varchar(500),
	CONSTRAINT `patient_report_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `patient_report_shares_token_unique` UNIQUE(`acknowledgementToken`)
);
--> statement-breakpoint
ALTER TABLE `clinic_public_settings` ADD `whatsappResponseNotice` varchar(500) DEFAULT 'Messages are reviewed during clinic hours; please allow a response on the next working day.' NOT NULL;--> statement-breakpoint
CREATE INDEX `guardian_contacts_child_status_idx` ON `guardian_contacts` (`clinicianUserId`,`childId`,`status`);--> statement-breakpoint
CREATE INDEX `patient_report_shares_child_created_idx` ON `patient_report_shares` (`clinicianUserId`,`childId`,`createdAt`);