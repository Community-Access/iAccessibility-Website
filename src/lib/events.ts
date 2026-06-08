import { and, asc, desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { events } from "@/db/schema";

export const EVENT_TYPES = [
  "stream",
  "meeting",
  "workshop",
  "deadline",
  "conference",
  "custom"
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type CalendarEvent = typeof events.$inferSelect;

const EVENT_TYPE_LABELS: Record<string, string> = {
  stream: "Live stream",
  meeting: "Meeting",
  workshop: "Workshop",
  deadline: "Deadline",
  conference: "Conference",
  custom: "Event"
};

export function eventTypeLabel(type: string | null | undefined) {
  return EVENT_TYPE_LABELS[type ?? ""] ?? "Event";
}

export function eventMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(value: string | null | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return eventMonthKey();
  const month = Number(match[2]);
  if (month < 1 || month > 12) return eventMonthKey();
  return `${match[1]}-${match[2]}`;
}

export function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return eventMonthKey(date);
}

export function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}

export function eventDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

export function eventTimeLabel(event: Pick<CalendarEvent, "startTime" | "endTime">) {
  const start = formatClock(event.startTime);
  const end = event.endTime ? formatClock(event.endTime) : "";
  return end ? `${start} to ${end}` : start;
}

function formatClock(value: string) {
  const [hourRaw, minute = "00"] = value.split(":");
  let hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  if (hour > 12) hour -= 12;
  return `${hour}:${minute} ${suffix}`;
}

export function eventsForMonth(allEvents: CalendarEvent[], monthKey: string) {
  return allEvents.filter((event) => event.eventDate.startsWith(monthKey));
}

export function groupEventsByDate(allEvents: CalendarEvent[]) {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of allEvents) {
    const bucket = groups.get(event.eventDate) ?? [];
    bucket.push(event);
    groups.set(event.eventDate, bucket);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export async function getPublishedEvents() {
  if (!hasDatabase || !db) return [];
  return db
    .select()
    .from(events)
    .where(eq(events.status, "published"))
    .orderBy(asc(events.eventDate), asc(events.startTime));
}

export async function getAdminEvents() {
  if (!hasDatabase || !db) return [];
  return db
    .select()
    .from(events)
    .orderBy(desc(events.eventDate), desc(events.startTime));
}

export async function getPublishedEventById(id: number) {
  if (!hasDatabase || !db) return null;
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.status, "published")))
    .limit(1);
  return rows[0] ?? null;
}

function dateTimeForCalendar(date: string, time: string) {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

function isoDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function addMinutesToTime(value: string, minutesToAdd: number) {
  const [hourRaw, minuteRaw = "0"] = value.split(":");
  const totalMinutes =
    (Number(hourRaw) * 60 + Number(minuteRaw) + minutesToAdd) % (24 * 60);
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function eventEndTime(event: Pick<CalendarEvent, "startTime" | "endTime">) {
  return event.endTime || addMinutesToTime(event.startTime, 60);
}

export function googleCalendarUrl(event: CalendarEvent) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title);
  url.searchParams.set(
    "dates",
    `${dateTimeForCalendar(event.eventDate, event.startTime)}/${dateTimeForCalendar(
      event.eventDate,
      eventEndTime(event)
    )}`
  );
  url.searchParams.set("ctz", event.timezone);
  if (event.description) url.searchParams.set("details", event.description);
  if (event.locationUrl || event.location) {
    url.searchParams.set("location", event.locationUrl || event.location || "");
  }
  return url.toString();
}

export function outlookCalendarUrl(event: CalendarEvent) {
  const url = new URL("https://outlook.live.com/calendar/0/action/compose");
  url.searchParams.set("rru", "addevent");
  url.searchParams.set("subject", event.title);
  url.searchParams.set("startdt", isoDateTime(event.eventDate, event.startTime));
  url.searchParams.set("enddt", isoDateTime(event.eventDate, eventEndTime(event)));
  if (event.description) url.searchParams.set("body", event.description);
  if (event.locationUrl || event.location) {
    url.searchParams.set("location", event.locationUrl || event.location || "");
  }
  return url.toString();
}

function escapeIcs(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function eventIcs(event: CalendarEvent) {
  const endTime = eventEndTime(event);
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//iAccessibility//Events//EN",
    "BEGIN:VEVENT",
    `UID:iaccessibility-event-${event.id}@iaccessibility.net`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${event.timezone}:${dateTimeForCalendar(
      event.eventDate,
      event.startTime
    )}`,
    `DTEND;TZID=${event.timezone}:${dateTimeForCalendar(event.eventDate, endTime)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : "",
    event.location || event.locationUrl
      ? `LOCATION:${escapeIcs(event.locationUrl || event.location)}`
      : "",
    event.locationUrl ? `URL:${escapeIcs(event.locationUrl)}` : "",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean);

  return `${lines.join("\r\n")}\r\n`;
}
