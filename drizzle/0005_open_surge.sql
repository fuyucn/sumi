CREATE TABLE "sumi_images" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"slug" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" text NOT NULL
);
