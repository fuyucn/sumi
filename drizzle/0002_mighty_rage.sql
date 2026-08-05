CREATE TABLE "agent_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_handle" text NOT NULL,
	"display_name" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "agent_keys_agent_handle_unique" UNIQUE("agent_handle")
);
