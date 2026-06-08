import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/events?month=${shiftMonth(activeMonth, -1)}`}
            className="rounded-md border border-[#767676] px-3 py-2 text-sm font-semibold text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Previous month
          </Link>
          <h2 className="text-2xl font-semibold" tabIndex={-1}>
            {monthLabel(activeMonth)}
          </h2>
          <Link
            href={`/events?month=${shiftMonth(activeMonth, 1)}`}
            className="rounded-md border border-[#767676] px-3 py-2 text-sm font-semibold text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Next month
          </Link>
        </div>

        {grouped.length === 0 ? (
          <div className="mt-6 rounded-lg border border-[#767676] bg-white p-8 text-center">
            <CalendarDays
              className="mx-auto mb-3 h-10 w-10 text-[#595959]"
              aria-hidden="true"
            />
            <h3 className="text-lg font-semibold text-[#222222]">
              No events scheduled
            </h3>
            <p className="mt-1 text-[#595959]">
              {isAdmin
                ? "Check another month or add an event from the admin area."
                : "Check another month for upcoming events."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {grouped.map(([date, events]) => (
              <section key={date} className="space-y-3">
                <h3 className="text-xl font-semibold">
                  {eventDateLabel(date)}
                </h3>
                <ul className="grid gap-4">
                  {events.map((event) => (
                    <li key={event.id}>
                      <article className="rounded-lg border border-[#767676] bg-white p-4 shadow-wordpress">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold uppercase text-[#595959]">
                              {eventTypeLabel(event.type)}
                            </p>
                            <h4 className="mt-1 text-lg font-semibold text-[#222222]">
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
                          </div>
                          <p className="text-sm font-medium text-[#222222]">
                            {eventTimeLabel(event)} {event.timezone}
                          </p>
                        </div>
                        {event.description ? (
                          <p className="mt-3 text-[#595959]">
                            {event.description}
                          </p>
                        ) : null}
                        {event.location && !event.locationUrl ? (
                          <p className="mt-3 text-sm text-[#595959]">
                            {event.location}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <a
                            href={googleCalendarUrl(event)}
                            aria-label={`Add to Google Calendar for ${event.title} (opens in a new tab)`}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="rounded-md border border-[#767676] px-3 py-1.5 text-sm font-semibold text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            Add to Google
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                          <a
                            href={outlookCalendarUrl(event)}
                            aria-label={`Add to Outlook Calendar for ${event.title} (opens in a new tab)`}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="rounded-md border border-[#767676] px-3 py-1.5 text-sm font-semibold text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            Add to Outlook
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                          <a
                            href={`/events/${event.id}/ics`}
                            aria-label={`Download .ics file for ${event.title}`}
                            className="rounded-md border border-[#767676] px-3 py-1.5 text-sm font-semibold text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            Download .ics
                          </a>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
