CREATE TABLE `checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuarioId` int NOT NULL,
	`setorId` int NOT NULL,
	`tipoTarefaId` int NOT NULL,
	`epiValidado` boolean NOT NULL DEFAULT false,
	`ambienteValidado` boolean NOT NULL DEFAULT false,
	`assinaturaPendente` boolean NOT NULL DEFAULT true,
	`observacoes` text,
	`assinaturaPNG` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `epcs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `epcs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `epis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `epis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ordens_servico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checkinId` int NOT NULL,
	`usuarioId` int NOT NULL,
	`tipoTarefaId` int NOT NULL,
	`status` enum('pendente','assinada','concluida') NOT NULL DEFAULT 'pendente',
	`numero` varchar(50) NOT NULL,
	`descricao` text,
	`formularioRespostas` json,
	`assinaturaPNG` text,
	`dataAssinatura` timestamp,
	`urlPDF` text,
	`urlPNG` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ordens_servico_id` PRIMARY KEY(`id`),
	CONSTRAINT `ordens_servico_numero_unique` UNIQUE(`numero`)
);
--> statement-breakpoint
CREATE TABLE `setores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `setores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tipos_tarefa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`grauRisco` enum('baixo','medio','alto','critico') NOT NULL,
	`riscos` json,
	`epiIds` json,
	`epcIds` json,
	`formularioSchema` json,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tipos_tarefa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin','developer') NOT NULL DEFAULT 'user',
	`matricula` varchar(50),
	`setor` varchar(100),
	`gestorImediato` varchar(100),
	`senhaDigitos` varchar(4),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_matricula_unique` UNIQUE(`matricula`)
);
--> statement-breakpoint
CREATE TABLE `validacoes_ambiente` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checkinId` int NOT NULL,
	`condicao` varchar(100) NOT NULL,
	`valor` varchar(100) NOT NULL,
	`dentro_parametros` boolean NOT NULL DEFAULT true,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `validacoes_ambiente_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `validacoes_epi` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checkinId` int NOT NULL,
	`epiId` int NOT NULL,
	`validado` boolean NOT NULL DEFAULT false,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `validacoes_epi_id` PRIMARY KEY(`id`)
);
