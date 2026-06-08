import { NextResponse } from "next/server";
import { eventsIcsFeed, getPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = await getPublishedEvents();

  return new NextResponse(eventsIcsFeed(events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="iaccessibility-events.ics"',
      "Cache-Control": "public, max-age=300"
    }
  });
}
