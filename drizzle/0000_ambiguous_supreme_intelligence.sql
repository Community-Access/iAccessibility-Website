CREATE TYPE "public"."content_status" AS ENUM('draft', 'pending', 'published');--> statement-breakpoint
CREATE TYPE "public"."directory_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."podcast_type" AS ENUM('episodic', 'serial');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'moderator', 'member');--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text NOT NULL,
	"excerpt" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"author_id" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "directory_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "directory_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "directory_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_name" text NOT NULL,
	"slug" text NOT NULL,
	"itunes_app_id" text,
	"description" text,
	"icon_url" text,
	"app_store_url" text,
	"website_url" text,
	"status" "directory_status" DEFAULT 'pending' NOT NULL,
	"submitted_by" integer,
	"approved_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "directory_entries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "directory_entry_categories" (
	"entry_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "directory_entry_categories_entry_id_category_id_pk" PRIMARY KEY("entry_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "guidelines" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guidelines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"mime" text,
	"bytes" bigint,
	"alt" text,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "podcast_episodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"show_id" integer NOT NULL,
	"guid" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"show_notes" text,
	"transcript" text,
	"pub_date" timestamp,
	"enclosure_url" text,
	"spaces_key" text,
	"byte_length" bigint,
	"mime" text,
	"duration_seconds" integer,
	"episode_no" integer,
	"season" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "podcast_episodes_guid_unique" UNIQUE("guid")
);
--> statement-breakpoint
CREATE TABLE "podcast_shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"language" text DEFAULT 'en-us' NOT NULL,
	"author" text,
	"owner_name" text,
	"owner_email" text,
	"itunes_category" text,
	"explicit" boolean DEFAULT false NOT NULL,
	"type" "podcast_type" DEFAULT 'episodic' NOT NULL,
	"cover_art_key" text,
	"feed_slug" text NOT NULL,
	"external_import_url" text,
	"spaces_prefix" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "podcast_shows_slug_unique" UNIQUE("slug"),
	CONSTRAINT "podcast_shows_feed_slug_unique" UNIQUE("feed_slug")
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
	"post_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "post_categories_post_id_category_id_pk" PRIMARY KEY("post_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"stack_user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_stack_user_id_unique" UNIQUE("stack_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_entries" ADD CONSTRAINT "directory_entries_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_entries" ADD CONSTRAINT "directory_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_entry_categories" ADD CONSTRAINT "directory_entry_categories_entry_id_directory_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."directory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_entry_categories" ADD CONSTRAINT "directory_entry_categories_category_id_directory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."directory_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podcast_episodes" ADD CONSTRAINT "podcast_episodes_show_id_podcast_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."podcast_shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_author_idx" ON "blog_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "directory_entries_status_idx" ON "directory_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "directory_entries_submitted_by_idx" ON "directory_entries" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "directory_entry_categories_category_idx" ON "directory_entry_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "podcast_episodes_show_idx" ON "podcast_episodes" USING btree ("show_id");--> statement-breakpoint
CREATE INDEX "podcast_episodes_pub_date_idx" ON "podcast_episodes" USING btree ("pub_date");--> statement-breakpoint
CREATE UNIQUE INDEX "podcast_episodes_show_slug_uq" ON "podcast_episodes" USING btree ("show_id","slug");--> statement-breakpoint
CREATE INDEX "post_categories_category_idx" ON "post_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "post_tags_tag_idx" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");