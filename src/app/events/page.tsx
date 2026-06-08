import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventSubscribe } from "@/components/events/event-subscribe";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { absoluteUrl } from "@/lib/utils";
import {
  eventDateLabel,
  eventTimeLabel,
  eventTypeLabel,
  eventsForMonth,
  googleCalendarUrl,
  groupEventsByDate,
  getPublishedEvents,
  monthLabel,
  outlookCalendarUrl,
  parseMonthKey,
  shiftMonth
} from "@/lib/events";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Events Calendar"
};

function isToday(date: string) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
  return date === today;
}

export default async function EventsPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ month }, user, allEvents] = await Promise.all([
    searchParams,
    getCurrentAppUser(),
    getPublishedEvents()
  ]);
  const activeMonth = parseMonthKey(month);
  const visibleEvents = eventsForMonth(allEvents, activeMonth);
  const grouped = groupEventsByDate(visibleEvents);
  const isAdmin = canAdmin(user?.role);

  return (
    <div className="wp-container space-y-8">
      <section className="wp-article">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="mt-3 max-w-3xl text-[#595959]">
              Upcoming iAccessibility live streams, workshops, meetings, and
              community events.
            </p>
          </div>
          {isAdmin ? (
            <Button asChild>
              <Link href="/admin/events">Add event</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="wp-article">
        <h2 className="text-2xl font-semibold">Calendar</h2>
        <div className="mt-5 mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link
              href={`/events?month=${shiftMonth(activeMonth, -1)}`}
              className="rounded-md border-2 border-[#6b7280] bg-white px-3 py-2 text-sm font-semibold text-[#222222] no-underline hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Previous
            </Link>
            <p className="flex-1 text-center text-xl font-extrabold text-[#222222]">
              {monthLabel(activeMonth)}
            </p>
            <Link
              href={`/events?month=${shiftMonth(activeMonth, 1)}`}
              className="rounded-md border-2 border-[#6b7280] bg-white px-3 py-2 text-sm font-semibold text-[#222222] no-underline hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Next
            </Link>
          </div>

          {grouped.length === 0 ? (
            <div className="rounded-lg border border-[#767676] bg-white p-8 text-center">
              <CalendarDays
                className="mx-auto mb-3 h-10 w-10 text-[#595959]"
                aria-hidden="true"
              />
              <h3 className="text-lg font-semibold text-[#222222]">
                No events scheduled for {monthLabel(activeMonth)}
              </h3>
              <p className="mt-1 text-[#595959]">
                {isAdmin
                  ? "Check another month or add an event from the admin area."
                  : "Check another month for upcoming events."}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([date, events]) => (
                <div key={date}>
                  <h3 className="border-b-2 border-[#d4d4d4] pb-3 text-xl font-extrabold text-[#222222]">
                    {eventDateLabel(date)}
                    {isToday(date) ? (
                      <span className="ml-2 rounded bg-[#047857] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                        Today
                      </span>
                    ) : null}
                  </h3>
                  <ul className="mt-4 space-y-4">
                    {events.map((event) => (
                      <li key={event.id}>
                        <article className="rounded-xl border border-[#d4d4d4] bg-[#f9fafb] p-5 transition-shadow hover:shadow-wordpress">
                          <h4 className="text-lg font-bold text-[#222222]">
                            {event.locationUrl ? (
                              <a
                                href={event.locationUrl}
                                rel="noopener noreferrer"
                                target="_blank"
                                className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                {event.title}
                                <span className="sr-only">
                                  {" "}
                                  (opens in a new tab)
                                </span>
                              </a>
                            ) : (
                              event.title
                            )}
                          </h4>
                          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#595959]">
                            <span className="rounded bg-[#4f46e5] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                              {eventTypeLabel(event.type)}
                            </span>
                            <span>
                              {eventTimeLabel(event)} {event.timezone}
                            </span>
                            {event.location ? <span>{event.location}</span> : null}
                          </p>
                          {event.description ? (
                            <p className="mt-3 text-[#595959]">
                              {event.description}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                            <a
                              href={googleCalendarUrl(event)}
                              aria-label={`Add ${event.title} to Google Calendar (opens in a new tab)`}
                              rel="noopener noreferrer"
                              target="_blank"
                              className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              Google Calendar
                              <span className="sr-only">
                                {" "}
                                for {event.title} (opens in a new tab)
                              </span>
                            </a>
                            <a
                              href={outlookCalendarUrl(event)}
                              aria-label={`Add ${event.title} to Outlook Calendar (opens in a new tab)`}
                              rel="noopener noreferrer"
                              target="_blank"
                              className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              Outlook
                              <span className="sr-only">
                                {" "}
                                for {event.title} (opens in a new tab)
                              </span>
                            </a>
                            <Link
                              href={`/events/${event.id}/ics`}
                              aria-label={`Download .ics file for ${event.title}`}
                              className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              Download .ics
                              <span className="sr-only"> for {event.title}</span>
                            </Link>
                            <Link
                              href={`/events/${event.id}`}
                              aria-label={`View details for ${event.title}`}
                              className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              View details
                              <span className="sr-only"> for {event.title}</span>
                            </Link>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <EventSubscribe
            icsUrl={absoluteUrl("/events/calendar.ics")}
            rssUrl={absoluteUrl("/events/feed.xml")}
          />
        </div>
      </section>
    </div>
  );
}
