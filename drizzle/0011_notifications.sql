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
