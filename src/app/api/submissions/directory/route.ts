import { NextResponse } from "next/server";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { directoryEntries } from "@/db/schema";
import { notifyAdminSubmission, sendSubmissionReceived } from "@/lib/email/client";
import { getCurrentAppUser } from "@/lib/auth/server";
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
  appStoreUrl: z.string().url(),
  websiteUrl: z.string().url()
});

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
  const detailText = [
    data.description,
    "",
    "Submission metadata:",
    `App version: ${data.appVersion}`,
    `Platform: ${data.platform}`,
    `Directory category: ${data.category}`,
    `Free or paid: ${data.paidStatus}`,
    data.price ? `Price: ${data.price}` : "",
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
      appStoreUrl: data.appStoreUrl,
      websiteUrl: data.websiteUrl,
      status: "pending",
      submittedBy: user.id
    })
    .returning();

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

  return NextResponse.json({ id: entry?.id, status: "pending" });
}
