CREATE TABLE "sumi_ai_providers" (
	"handle" text PRIMARY KEY NOT NULL,
	"base_url" text DEFAULT 'https://api.openai.com/v1' NOT NULL,
	"api_key" text NOT NULL,
	"model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sumi_ai_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"post_handle" text NOT NULL,
	"post_slug" text NOT NULL,
	"kind" text DEFAULT 'summary' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" text,
	"error" text,
	"model" text,
	"created_at" text NOT NULL,
	"started_at" text,
	"finished_at" text
);
--> statement-breakpoint
CREATE TABLE "sumi_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"type" text NOT NULL,
	"actor" text NOT NULL,
	"post_handle" text,
	"post_slug" text,
	"comment_id" text,
	"body" text,
	"date" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sumi_pages" (
	"handle" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"body" text NOT NULL,
	"show_in_nav" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "sumi_pages_handle_slug_pk" PRIMARY KEY("handle","slug")
);
--> statement-breakpoint
CREATE TABLE "sumi_projects" (
	"handle" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"repo" text,
	"tech" text DEFAULT '[]' NOT NULL,
	"cover_image" text,
	"gallery" text,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "sumi_projects_handle_slug_pk" PRIMARY KEY("handle","slug")
);
