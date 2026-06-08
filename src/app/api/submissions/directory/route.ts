import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import {
  directoryCategories,
  directoryEntries,
  directoryEntryCategories
} from "@/db/schema";
import { notifyAdminSubmission, sendSubmissionReceived } from "@/lib/email/client";
import { canModerate, getCurrentAppUser } from "@/lib/auth/server";
import { paragraphsFromText, slugify } from "@/lib/utils";

const schema = z.object({
  appName: z.string().min(1),
  appVersion: z.string().min(1),
  platform: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1).max(4000),
  paidStatus: z.string().min(1),
  price: z.string().optional(),
  testedDevices: z.string().min(1),
  accessibilityRating: z.string().optional(),
  accessibilityComments: z.string().min(1),
  screenReaderPerformance: z.string().min(1),
  buttonLabeling: z.string().min(1),
  usability: z.string().min(1),
  lowVisionComments: z.string().optional(),
  otherComments: z.string().optional(),
  itunesAppId: z.string().optional(),
  iconUrl: z.string().url().optional().or(z.literal("")),
  accessibilityNutritionLabels: z.string().optional(),
  appStoreUrl: z.string().url(),
  websiteUrl: z.string().url().optional().or(z.literal(""))
});

function platformTaxonomyPrefix(platform: string) {
  if (platform === "iOS/iPadOS") return "iOS";
  if (platform === "VisionOS") return "visionOS";
  return platform;
}

function categoryCandidates(platform: string, category: string) {
  const prefix = platformTaxonomyPrefix(platform);
  return [`${prefix}: ${category}`, category];
}

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to submit an app." },
      { status: 401 }
    );
  }

  if (!hasDatabase || !db) {
    return NextResponse.json(
      { error: "The database is not configured." },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    appName: value(formData, "appName"),
    appVersion: value(formData, "appVersion"),
    platform: value(formData, "platform"),
    category: value(formData, "category"),
    description: value(formData, "description"),
    paidStatus: value(formData, "paidStatus"),
    price: value(formData, "price"),
    testedDevices: value(formData, "testedDevices"),
    accessibilityRating: value(formData, "accessibilityRating"),
    accessibilityComments: value(formData, "accessibilityComments"),
    screenReaderPerformance: value(formData, "screenReaderPerformance"),
    buttonLabeling: value(formData, "buttonLabeling"),
    usability: value(formData, "usability"),
    lowVisionComments: value(formData, "lowVisionComments"),
    otherComments: value(formData, "otherComments"),
    itunesAppId: value(formData, "itunesAppId"),
    iconUrl: value(formData, "iconUrl"),
    accessibilityNutritionLabels: value(formData, "accessibilityNutritionLabels"),
    appStoreUrl: value(formData, "appStoreUrl"),
    websiteUrl: value(formData, "websiteUrl")
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete all required app submission fields." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const autoApprove = canModerate(user.role);
  const detailText = [
    data.description,
    "",
    "Submission metadata:",
    `App version: ${data.appVersion}`,
    `Platform: ${data.platform}`,
    `Directory category: ${data.category}`,
    `Free or paid: ${data.paidStatus}`,
    data.price ? `Price: ${data.price}` : "",
    data.itunesAppId ? `iTunes app ID: ${data.itunesAppId}` : "",
    data.accessibilityNutritionLabels
      ? `Accessibility Nutrition Labels: ${data.accessibilityNutritionLabels}`
      : "Accessibility Nutrition Labels: Not returned by Apple public lookup",
    `Tested devices: ${data.testedDevices}`,
    data.accessibilityRating ? `Accessibility rating: ${data.accessibilityRating}` : "",
    "",
    "Accessibility review:",
    `Accessibility comments: ${data.accessibilityComments}`,
    `Screen reader performance: ${data.screenReaderPerformance}`,
    `Button labeling: ${data.buttonLabeling}`,
    `Usability: ${data.usability}`,
    data.lowVisionComments
      ? `Low vision accessibility comments: ${data.lowVisionComments}`
      : "",
    data.otherComments ? `Other comments: ${data.otherComments}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const [entry] = await db
    .insert(directoryEntries)
    .values({
      appName: data.appName,
      slug: `${slugify(data.appName)}-${Date.now()}`,
      description: paragraphsFromText(detailText),
      itunesAppId: data.itunesAppId || null,
      iconUrl: data.iconUrl || null,
      appStoreUrl: data.appStoreUrl,
      websiteUrl: data.websiteUrl || null,
      status: autoApprove ? "approved" : "pending",
      submittedBy: user.id,
      approvedBy: autoApprove ? user.id : null
    })
    .returning();

  if (entry) {
    const candidates = categoryCandidates(data.platform, data.category);
    const [category] = await db
      .select({ id: directoryCategories.id })
      .from(directoryCategories)
      .where(inArray(directoryCategories.name, candidates))
      .limit(1);

    if (category) {
      await db.insert(directoryEntryCategories).values({
        entryId: entry.id,
        categoryId: category.id
      });
    }
  }

  if (!autoApprove) {
    void notifyAdminSubmission({
      kind: "directory",
      itemTitle: data.appName,
      rows: [
        ["App", data.appName],
        ["Platform", data.platform],
        ["Category", data.category],
        ["Submitted by", user.email],
        ["Review queue ID", String(entry?.id ?? "")]
      ]
    });
    void sendSubmissionReceived(user.email, {
      kind: "directory",
      name: user.displayName,
      itemTitle: data.appName
    });
  }

  return NextResponse.json({
    id: entry?.id,
    status: autoApprove ? "approved" : "pending"
  });
}
