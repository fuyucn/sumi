CREATE TABLE "sumi_projects" (
	"handle" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"repo" text,
	"tech" text DEFAULT '[]' NOT NULL,
	"cover_image" text,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "sumi_projects_handle_slug_pk" PRIMARY KEY("handle","slug")
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
