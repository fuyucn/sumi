CREATE TABLE "sumi_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_handle" text NOT NULL,
	"post_slug" text NOT NULL,
	"author_handle" text NOT NULL,
	"body" text NOT NULL,
	"date" text NOT NULL,
	"parent_id" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sumi_magazines" (
	"handle" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"items" text DEFAULT '[]' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "sumi_magazines_handle_slug_pk" PRIMARY KEY("handle","slug")
);
--> statement-breakpoint
CREATE TABLE "sumi_posts" (
	"handle" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"tags" text DEFAULT '[]' NOT NULL,
	"excerpt" text,
	"cover_image" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "sumi_posts_handle_slug_pk" PRIMARY KEY("handle","slug")
);
--> statement-breakpoint
CREATE TABLE "sumi_profiles" (
	"handle" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"bio" text,
	"updated_at" text NOT NULL
);
