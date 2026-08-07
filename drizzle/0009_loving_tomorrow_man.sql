CREATE TABLE "sumi_friends" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"avatar" text,
	"bio" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sumi_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"body" text NOT NULL,
	"date" text NOT NULL,
	"created_at" text NOT NULL
);
