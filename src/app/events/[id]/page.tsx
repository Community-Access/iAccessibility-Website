import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  eventDateLabel,
  eventTimeLabel,
  eventTypeLabel,
  getPublishedEventById,
  googleCalendarUrl,
  outlookCalendarUrl
} from "@/lib/events";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getPublishedEventById(Number(id));
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description:
      event.description ||
      `${eventTypeLabel(event.type)} on ${eventDateLabel(event.eventDate)}.`
  };
}

export default async function EventDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getPublishedEventById(Number(id));
  if (!event) notFound();

  const isVirtual = Boolean(event.locationUrl);
  const linkClass =
    "text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="wp-container">
      <article className="wp-article">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#595959]">
          {eventTypeLabel(event.type)}
        </p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">{event.title}</h1>

        <dl className="mt-6 space-y-3">
          <div>
            <dt className="text-sm font-semibold text-[#595959]">When</dt>
            <dd className="text-[#222222]">
              {eventDateLabel(event.eventDate)}, {eventTimeLabel(event)}{" "}
              {event.timezone}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-[#595959]">
              {isVirtual ? "Where" : "Location"}
            </dt>
            <dd className="text-[#222222]">
              {isVirtual ? (
                <a
                  href={event.locationUrl ?? "#"}
                  rel="noopener noreferrer"
                  target="_blank"
                  className={linkClass}
                >
                  Join the virtual event
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                event.location || "To be announced"
              )}
            </dd>
          </div>
        </dl>

        {event.description ? (
          <>
            <h2 className="mt-8 text-2xl font-semibold">About this event</h2>
            <p className="mt-3 whitespace-pre-wrap text-[#222222]">
              {event.description}
            </p>
          </>
        ) : null}

        <h2 className="mt-8 text-2xl font-semibold">Add to calendar</h2>
        <ul className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
          <li>
            <a
              href={googleCalendarUrl(event)}
              rel="noopener noreferrer"
              target="_blank"
              className={linkClass}
            >
              Add to Google Calendar
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a
              href={outlookCalendarUrl(event)}
              rel="noopener noreferrer"
              target="_blank"
              className={linkClass}
            >
              Add to Outlook Calendar
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={`/events/${event.id}/ics`} className={linkClass}>
              Download calendar file (.ics)
            </a>
          </li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">Subscribe</h2>
        <p className="mt-3">
          <Link href="/events#subscribe" className={linkClass}>
            Subscribe to all iAccessibility events
          </Link>
        </p>
      </article>
    </div>
  );
}
