import {
  type AnyPgColumn,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

export const contentStatus = pgEnum("content_status", [
  "draft",
  "pending",
  "published"
]);

export const directoryStatus = pgEnum("directory_status", [
  "pending",
  "approved",
  "rejected"
]);

export const podcastType = pgEnum("podcast_type", ["episodic", "serial"]);
export const userRole = pgEnum("user_role", ["admin", "moderator", "member"]);
export const commentStatus = pgEnum("comment_status", ["visible", "deleted"]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    authUserId: text("auth_user_id").notNull().unique(),
    legacyWpUserId: integer("legacy_wp_user_id").unique(),
    email: text("email").notNull().unique(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    role: userRole("role").notNull().default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => ({
    roleIdx: index("users_role_idx").on(table.role)
  })
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    body: text("body").notNull(),
    excerpt: text("excerpt"),
    authorName: text("author_name"),
    featuredImageUrl: text("featured_image_url"),
    featuredImageAlt: text("featured_image_alt"),
    status: contentStatus("status").notNull().default("draft"),
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null"
    }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    legacyWpPostId: integer("legacy_wp_post_id").unique()
  },
  (table) => ({
    authorIdx: index("blog_posts_author_idx").on(table.authorId),
    statusIdx: index("blog_posts_status_idx").on(table.status),
    publishedAtIdx: index("blog_posts_published_at_idx").on(table.publishedAt)
  })
);

export const blogCategories = pgTable("blog_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description")
});

export const postCategories = pgTable(
  "post_categories",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => blogCategories.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.categoryId] }),
    categoryIdx: index("post_categories_category_idx").on(table.categoryId)
  })
);

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique()
});

export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.tagId] }),
    tagIdx: index("post_tags_tag_idx").on(table.tagId)
  })
);

export const postComments = pgTable(
  "post_comments",
  {
    id: serial("id").primaryKey(),
    postSlug: text("post_slug").notNull(),
    // Self-reference enables threaded replies. onDelete cascade so removing a
    // parent removes its subtree; soft-delete (status) is used instead for
    // anything that still has visible replies.
    parentId: integer("parent_id").references(
      (): AnyPgColumn => postComments.id,
      { onDelete: "cascade" }
    ),
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null"
    }),
    authorName: text("author_name"),
    body: text("body").notNull(),
    status: commentStatus("status").notNull().default("visible"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => ({
    postCreatedIdx: index("post_comments_post_created_idx").on(
      table.postSlug,
      table.createdAt
    ),
    parentIdx: index("post_comments_parent_idx").on(table.parentId),
    authorIdx: index("post_comments_author_idx").on(table.authorId)
  })
);

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  body: text("body").notNull(),
  status: contentStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  legacyWpPostId: integer("legacy_wp_post_id").unique()
});

export const guidelines = pgTable("guidelines", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  legacyWpPostId: integer("legacy_wp_post_id").unique()
});

export const directoryCategories = pgTable("directory_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description")
});

export const directoryEntries = pgTable(
  "directory_entries",
  {
    id: serial("id").primaryKey(),
    appName: text("app_name").notNull(),
    slug: text("slug").notNull().unique(),
    itunesAppId: text("itunes_app_id"),
    description: text("description"),
    iconUrl: text("icon_url"),
    appStoreUrl: text("app_store_url"),
    websiteUrl: text("website_url"),
    status: directoryStatus("status").notNull().default("pending"),
    submittedBy: integer("submitted_by").references(() => users.id, {
      onDelete: "set null"
    }),
    approvedBy: integer("approved_by").references(() => users.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    legacyWpPostId: integer("legacy_wp_post_id").unique()
  },
  (table) => ({
    statusIdx: index("directory_entries_status_idx").on(table.status),
    submittedByIdx: index("directory_entries_submitted_by_idx").on(
      table.submittedBy
    )
  })
);

export const directoryEntryCategories = pgTable(
  "directory_entry_categories",
  {
    entryId: integer("entry_id")
      .notNull()
      .references(() => directoryEntries.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => directoryCategories.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entryId, table.categoryId] }),
    categoryIdx: index("directory_entry_categories_category_idx").on(
      table.categoryId
    )
  })
);

export const directoryComments = pgTable(
  "directory_comments",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id")
      .notNull()
      .references(() => directoryEntries.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references(
      (): AnyPgColumn => directoryComments.id,
      { onDelete: "cascade" }
    ),
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null"
    }),
    authorName: text("author_name"),
    body: text("body").notNull(),
    status: commentStatus("status").notNull().default("visible"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => ({
    entryCreatedIdx: index("directory_comments_entry_created_idx").on(
      table.entryId,
      table.createdAt
    ),
    parentIdx: index("directory_comments_parent_idx").on(table.parentId),
    authorIdx: index("directory_comments_author_idx").on(table.authorId)
  })
);

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  url: text("url").notNull(),
  mime: text("mime"),
  bytes: integer("bytes"),
  alt: text("alt"),
  uploadedBy: integer("uploaded_by").references(() => users.id, {
    onDelete: "set null"
  }),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    eventDate: text("event_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time"),
    timezone: text("timezone").notNull().default("America/Chicago"),
    type: text("type").notNull().default("stream"),
    location: text("location"),
    locationUrl: text("location_url"),
    status: contentStatus("status").notNull().default("published"),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => ({
    statusIdx: index("events_status_idx").on(table.status),
    dateIdx: index("events_event_date_idx").on(table.eventDate),
    createdByIdx: index("events_created_by_idx").on(table.createdBy)
  })
);

export const podcastShows = pgTable("podcast_shows", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  language: text("language").notNull().default("en-us"),
  author: text("author"),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  category: text("category"),
  explicit: text("explicit").notNull().default("false"),
  type: podcastType("type").notNull().default("episodic"),
  coverArtKey: text("cover_art_key"),
  imageUrl: text("image_url"),
  feedSlug: text("feed_slug").notNull().unique(),
  externalImportUrl: text("external_import_url"),
  spacesPrefix: text("spaces_prefix"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const podcastEpisodes = pgTable(
  "podcast_episodes",
  {
    id: serial("id").primaryKey(),
    showId: integer("show_id")
      .notNull()
      .references(() => podcastShows.id, { onDelete: "cascade" }),
    guid: text("guid").notNull().unique(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    showNotes: text("show_notes"),
    transcript: text("transcript"),
    pubDate: timestamp("pub_date"),
    enclosureUrl: text("enclosure_url"),
    spacesKey: text("spaces_key"),
    byteLength: integer("byte_length"),
    mime: text("mime"),
    durationSeconds: integer("duration_seconds"),
    episodeNo: integer("episode_no"),
    season: integer("season"),
    imageUrl: text("image_url"),
    legacyWpPostId: integer("legacy_wp_post_id").unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => ({
    showIdx: index("podcast_episodes_show_idx").on(table.showId),
    pubDateIdx: index("podcast_episodes_pub_date_idx").on(table.pubDate),
    showSlugUq: uniqueIndex("podcast_episodes_show_slug_uq").on(
      table.showId,
      table.slug
    )
  })
);
