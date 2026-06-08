import { NextResponse } from "next/server";
import { eventIcs, getPublishedEventById } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await getPublishedEventById(Number(id));

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return new NextResponse(eventIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`
    }
  });
}
