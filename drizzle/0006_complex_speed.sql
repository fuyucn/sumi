CREATE TABLE "sumi_likes" (
	"post_handle" text NOT NULL,
	"post_slug" text NOT NULL,
	"liker_handle" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "sumi_likes_post_handle_post_slug_liker_handle_pk" PRIMARY KEY("post_handle","post_slug","liker_handle")
);
