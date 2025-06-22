CREATE TABLE IF NOT EXISTS "chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid(),
	"url_id" varchar(255),
	"user_id" varchar(255),
	"description" text,
	"messages" jsonb NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chats_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "chats_url_id_unique" UNIQUE("url_id")
);
