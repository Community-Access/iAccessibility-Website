ALTER TABLE "blog_posts" ADD COLUMN "legacy_wp_post_id" integer;--> statement-breakpoint
ALTER TABLE "directory_entries" ADD COLUMN "legacy_wp_post_id" integer;--> statement-breakpoint
ALTER TABLE "guidelines" ADD COLUMN "legacy_wp_post_id" integer;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "legacy_wp_post_id" integer;--> statement-breakpoint
ALTER TABLE "podcast_episodes" ADD COLUMN "legacy_wp_post_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legacy_wp_user_id" integer;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_legacy_wp_post_id_unique" UNIQUE("legacy_wp_post_id");--> statement-breakpoint
ALTER TABLE "directory_entries" ADD CONSTRAINT "directory_entries_legacy_wp_post_id_unique" UNIQUE("legacy_wp_post_id");--> statement-breakpoint
ALTER TABLE "guidelines" ADD CONSTRAINT "guidelines_legacy_wp_post_id_unique" UNIQUE("legacy_wp_post_id");--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_legacy_wp_post_id_unique" UNIQUE("legacy_wp_post_id");--> statement-breakpoint
ALTER TABLE "podcast_episodes" ADD CONSTRAINT "podcast_episodes_legacy_wp_post_id_unique" UNIQUE("legacy_wp_post_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_legacy_wp_user_id_unique" UNIQUE("legacy_wp_user_id");