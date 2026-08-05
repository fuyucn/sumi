CREATE TABLE "sumi_follows" (
	"follower_handle" text NOT NULL,
	"followee_handle" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "sumi_follows_follower_handle_followee_handle_pk" PRIMARY KEY("follower_handle","followee_handle")
);
