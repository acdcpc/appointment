CREATE TABLE `service_suggestion_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suggestionId` varchar(120) NOT NULL,
	`suggestedService` varchar(80) NOT NULL,
	`status` enum('submitted','reviewed') NOT NULL DEFAULT 'submitted',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_suggestion_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_suggestion_request_id_unique` UNIQUE(`suggestionId`)
);
--> statement-breakpoint
CREATE INDEX `service_suggestion_request_service_time_idx` ON `service_suggestion_requests` (`suggestedService`,`requestedAt`);