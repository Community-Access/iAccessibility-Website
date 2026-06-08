"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { events } from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { EVENT_TYPES } from "@/lib/events";
import { slugify } from "@/lib/utils";

export type EventActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialEventActionState: EventActionState = {
  status: "idle",
  message: ""
};

const eventSchema = z.object({
  title: z.string().min(1),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  timezone: z.string().min(1),
  type: z.enum(EVENT_TYPES),
  location: z.string().optional(),
  locationUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  status: z.enum(["draft", "published"])
});

async function requireAdmin() {
  const user = await getCurrentAppUser();
  if (!user || !canAdmin(user.role)) {
    throw new Error("You are not authorized to manage events.");
  }
  if (!hasDatabase || !db) {
    throw new Error("The database is not configured.");
  }
  return user;
}

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

export async function createEvent(
  _state: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  try {
    const user = await requireAdmin();
    const parsed = eventSchema.safeParse({
      title: value(formData, "title"),
      eventDate: value(formData, "eventDate"),
      startTime: value(formData, "startTime"),
      endTime: value(formData, "endTime"),
      timezone: value(formData, "timezone") || "America/Chicago",
      type: value(formData, "type") || "stream",
      location: value(formData, "location"),
      locationUrl: value(formData, "locationUrl"),
      description: value(formData, "description"),
      status: value(formData, "status") || "published"
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Complete the required event fields."
      };
    }

    const data = parsed.data;
    const slug = `${slugify(data.title)}-${data.eventDate}-${Date.now()}`;

    await db!.insert(events).values({
      title: data.title,
      slug,
      eventDate: data.eventDate,
      startTime: data.startTime,
      endTime: data.endTime || null,
      timezone: data.timezone,
      type: data.type,
      location: data.location || null,
      locationUrl: data.locationUrl || null,
      description: data.description || null,
      status: data.status,
      createdBy: user.id
    });

    revalidatePath("/admin/events");
    revalidatePath("/admin");
    revalidatePath("/events");

    return {
      status: "success",
      message:
        data.status === "published"
          ? "Event published."
          : "Event saved as a draft."
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Could not create the event."
    };
  }
}

export async function setEventStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = value(formData, "status");
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid event.");
  }
  if (status !== "draft" && status !== "published") {
    throw new Error("Invalid event status.");
  }

  await db!
    .update(events)
    .set({ status, updatedAt: new Date() })
    .where(eq(events.id, id));

  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/events");
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid event.");
  }

  await db!.delete(events).where(eq(events.id, id));

  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath("/events");
}
