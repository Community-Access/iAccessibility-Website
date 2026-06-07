import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  pgEnum,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

// RBAC: admin -> full access, moderator -> content + review queue (no admin
// panel/users/keys), member -> authenticated submitter.
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "moderator",
  "member",
]);
export type UserRole = (typeof userRoleEnum.enumValues)[number];

// Blog posts / pages move through a review queue before publishing.
export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "pending",
  "published",
]);
export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];

// Directory submissions enter a pending-approval queue.
export const directoryStatusEnum = pgEnum("directory_status", [
  "pending",
  "approved",
  "rejected",
]);
export type DirectoryStatus = (typeof directoryStatusEnum.enumValues)[number];

// iTunes podcast feed type.
export const podcastTypeEnum = pgEnum("podcast_type", ["episodic", "serial"]);
export type PodcastType = (typeof podcastTypeEnum.enumValues)[number];

// ---------------------------------------------------------------------------
// Users (backed by Neon Auth / Better Auth identities)
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    // External auth provider (Neon Auth / Better Auth) user id. Unique per
    // identity; auto-linked by email on first sign-in for migrated "claim
    // later" accounts.
    authUserId: text("auth_user_id").unique().notNull(),
    // Original WordPress user id; preserved for idempotent re-import and
    // email-based "claim later" account linking. Null for net-new users.
    legacyWpUserId: integer("legacy_wp_user_id").unique(),
    email: text("email").unique().notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").default("member").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("users_role_idx").on(t.role)],
);

// ---------------------------------------------------------------------------
// Blog: posts, categories, tags (taxonomy SEPARATE from the app directory)
// ---------------------------------------------------------------------------

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").unique().notNull(),
    body: text("body").notNull(),
    excerpt: text("excerpt"),
    // Original WordPress post id; preserved for idempotent re-import.
    legacyWpPostId: integer("legacy_wp_post_id").unique(),
    status: contentStatusEnum("status").default("draft").notNull(),
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("blog_posts_status_idx").on(t.status),
    index("blog_posts_author_idx").on(t.authorId),
    index("blog_posts_published_at_idx").on(t.publishedAt),
  ],
);

export const blogCategories = pgTable("blog_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
});

export const postCategories = pgTable(
  "post_categories",
  {
    postId: integer("post_id")
      .references(() => blogPosts.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: integer("category_id")
      .references(() => blogCategories.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.categoryId] }),
    index("post_categories_category_idx").on(t.categoryId),
  ],
);

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
});

export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id")
      .references(() => blogPosts.id, { onDelete: "cascade" })
      .notNull(),
    tagId: integer("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.tagId] }),
    index("post_tags_tag_idx").on(t.tagId),
  ],
);

// ---------------------------------------------------------------------------
// Pages and guidelines
// ---------------------------------------------------------------------------

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  body: text("body").notNull(),
  // Original WordPress page id; preserved for idempotent re-import.
  legacyWpPostId: integer("legacy_wp_post_id").unique(),
  status: contentStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const guidelines = pgTable("guidelines", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  body: text("body").notNull(),
  // Original WordPress wp_guideline post id; preserved for idempotent re-import.
  legacyWpPostId: integer("legacy_wp_post_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// App directory (its own taxonomy, distinct from the blog)
// ---------------------------------------------------------------------------

export const directoryEntries = pgTable(
  "directory_entries",
  {
    id: serial("id").primaryKey(),
    appName: text("app_name").notNull(),
    slug: text("slug").unique().notNull(),
    // Original WordPress jetpack-portfolio post id; preserved for idempotent
    // re-import.
    legacyWpPostId: integer("legacy_wp_post_id").unique(),
    // iTunes Search / Lookup API track id.
    itunesAppId: text("itunes_app_id"),
    description: text("description"),
    iconUrl: text("icon_url"),
    appStoreUrl: text("app_store_url"),
    websiteUrl: text("website_url"),
    status: directoryStatusEnum("status").default("pending").notNull(),
    submittedBy: integer("submitted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedBy: integer("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("directory_entries_status_idx").on(t.status),
    index("directory_entries_submitted_by_idx").on(t.submittedBy),
  ],
);

export const directoryCategories = pgTable("directory_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
});

export const directoryEntryCategories = pgTable(
  "directory_entry_categories",
  {
    entryId: integer("entry_id")
      .references(() => directoryEntries.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: integer("category_id")
      .references(() => directoryCategories.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.entryId, t.categoryId] }),
    index("directory_entry_categories_category_idx").on(t.categoryId),
  ],
);

// ---------------------------------------------------------------------------
// Podcasts: shows + episodes (self-hosted; binaries in Spaces, metadata here)
// ---------------------------------------------------------------------------

export const podcastShows = pgTable(
  "podcast_shows",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    language: text("language").default("en-us").notNull(),
    author: text("author"),
    ownerName: text("owner_name"),
    ownerEmail: text("owner_email"),
    itunesCategory: text("itunes_category"),
    explicit: boolean("explicit").default(false).notNull(),
    type: podcastTypeEnum("type").default("episodic").notNull(),
    // Spaces object key for cover art (square 1400-3000px JPEG/PNG).
    coverArtKey: text("cover_art_key"),
    // Stable, public feed slug for the self-hosted RSS URL.
    feedSlug: text("feed_slug").unique().notNull(),
    // External RSS source used when importing/migrating an existing feed.
    externalImportUrl: text("external_import_url"),
    // Spaces prefix for this show, e.g. iAccessibility/podcast/<show-slug>/.
    spacesPrefix: text("spaces_prefix"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

export const podcastEpisodes = pgTable(
  "podcast_episodes",
  {
    id: serial("id").primaryKey(),
    showId: integer("show_id")
      .references(() => podcastShows.id, { onDelete: "cascade" })
      .notNull(),
    // RSS guid; preserved verbatim on import so existing subscribers don't
    // lose episodes. Globally unique.
    guid: text("guid").unique().notNull(),
    // Original WordPress secondline_import post id; preserved for idempotent
    // re-import. guid remains the primary idempotency key on RSS import.
    legacyWpPostId: integer("legacy_wp_post_id").unique(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    showNotes: text("show_notes"),
    transcript: text("transcript"),
    pubDate: timestamp("pub_date"),
    // Public-read HTTPS enclosure URL served in the feed.
    enclosureUrl: text("enclosure_url"),
    // Spaces object key for the re-hosted audio.
    spacesKey: text("spaces_key"),
    // enclosure length in bytes (RFC says bytes; can exceed 2^31).
    byteLength: bigint("byte_length", { mode: "number" }),
    mime: text("mime"),
    durationSeconds: integer("duration_seconds"),
    episodeNo: integer("episode_no"),
    season: integer("season"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("podcast_episodes_show_idx").on(t.showId),
    index("podcast_episodes_pub_date_idx").on(t.pubDate),
    // Slugs are unique within a show, not globally.
    uniqueIndex("podcast_episodes_show_slug_uq").on(t.showId, t.slug),
  ],
);

// ---------------------------------------------------------------------------
// Media library (binaries in Spaces; metadata here)
// ---------------------------------------------------------------------------

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  // Spaces object key.
  key: text("key").unique().notNull(),
  url: text("url").notNull(),
  mime: text("mime"),
  bytes: bigint("bytes", { mode: "number" }),
  alt: text("alt"),
  uploadedBy: integer("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  authoredPosts: many(blogPosts),
  submittedEntries: many(directoryEntries, { relationName: "submitter" }),
  approvedEntries: many(directoryEntries, { relationName: "approver" }),
  uploadedMedia: many(media),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  postCategories: many(postCategories),
  postTags: many(postTags),
}));

export const blogCategoriesRelations = relations(
  blogCategories,
  ({ many }) => ({
    postCategories: many(postCategories),
  }),
);

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(blogPosts, {
    fields: [postCategories.postId],
    references: [blogPosts.id],
  }),
  category: one(blogCategories, {
    fields: [postCategories.categoryId],
    references: [blogCategories.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(blogPosts, {
    fields: [postTags.postId],
    references: [blogPosts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

export const directoryEntriesRelations = relations(
  directoryEntries,
  ({ one, many }) => ({
    submitter: one(users, {
      fields: [directoryEntries.submittedBy],
      references: [users.id],
      relationName: "submitter",
    }),
    approver: one(users, {
      fields: [directoryEntries.approvedBy],
      references: [users.id],
      relationName: "approver",
    }),
    entryCategories: many(directoryEntryCategories),
  }),
);

export const directoryCategoriesRelations = relations(
  directoryCategories,
  ({ many }) => ({
    entryCategories: many(directoryEntryCategories),
  }),
);

export const directoryEntryCategoriesRelations = relations(
  directoryEntryCategories,
  ({ one }) => ({
    entry: one(directoryEntries, {
      fields: [directoryEntryCategories.entryId],
      references: [directoryEntries.id],
    }),
    category: one(directoryCategories, {
      fields: [directoryEntryCategories.categoryId],
      references: [directoryCategories.id],
    }),
  }),
);

export const podcastShowsRelations = relations(podcastShows, ({ many }) => ({
  episodes: many(podcastEpisodes),
}));

export const podcastEpisodesRelations = relations(
  podcastEpisodes,
  ({ one }) => ({
    show: one(podcastShows, {
      fields: [podcastEpisodes.showId],
      references: [podcastShows.id],
    }),
  }),
);

export const mediaRelations = relations(media, ({ one }) => ({
  uploader: one(users, {
    fields: [media.uploadedBy],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;

export type BlogCategory = typeof blogCategories.$inferSelect;
export type NewBlogCategory = typeof blogCategories.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export type Guideline = typeof guidelines.$inferSelect;
export type NewGuideline = typeof guidelines.$inferInsert;

export type DirectoryEntry = typeof directoryEntries.$inferSelect;
export type NewDirectoryEntry = typeof directoryEntries.$inferInsert;

export type DirectoryCategory = typeof directoryCategories.$inferSelect;
export type NewDirectoryCategory = typeof directoryCategories.$inferInsert;

export type PodcastShow = typeof podcastShows.$inferSelect;
export type NewPodcastShow = typeof podcastShows.$inferInsert;

export type PodcastEpisode = typeof podcastEpisodes.$inferSelect;
export type NewPodcastEpisode = typeof podcastEpisodes.$inferInsert;

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
