CREATE TABLE `guardian_record_access_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicianUserId` int NOT NULL,
	`challengeId` varchar(120) NOT NULL,
	`childId` varchar(120) NOT NULL,
	`referenceHash` varchar(64) NOT NULL,
	`verificationCodeHash` varchar(64) NOT NULL,
	`attemptCount` int NOT NULL DEFAULT 0,
	`issuedBy` varchar(255) NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`accessTokenHash` varchar(64),
	`accessExpiresAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `guardian_record_access_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardian_record_access_challenge_unique` UNIQUE(`challengeId`),
	CONSTRAINT `guardian_record_access_reference_unique` UNIQUE(`referenceHash`)
);
--> statement-breakpoint
CREATE INDEX `guardian_record_access_scope_child_idx` ON `guardian_record_access_challenges` (`clinicianUserId`,`childId`);--> statement-breakpoint
CREATE INDEX `guardian_record_access_token_idx` ON `guardian_record_access_challenges` (`accessTokenHash`);