import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import {
  eventDateLabel,
  eventTimeLabel,
  eventTypeLabel,
  getAdminEvents,
  type CalendarEvent
} from "@/lib/events";
import { SOCIAL_NETWORKS, configuredSocialNetworks } from "@/lib/social";
import { EventActions } from "./event-actions";
import { EventForm } from "./event-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin Events"
};

export default async function AdminEventsPage() {
  const user = await getCurrentAppUser();
  if (!canAdmin(user?.role)) redirect("/admin");

  const items = await getAdminEvents();
  const connected = configuredSocialNetworks();
  const shareNetworks = SOCIAL_NETWORKS.map((network) => ({
    id: network.id,
    label: network.label,
    connected: connected.has(network.id)
  }));
  const columns: ItemTableColumn<CalendarEvent>[] = [
    {
      key: "title",
      header: "Event",
      rowHeader: true,
      render: (event) => (
        <div>
          <span className="font-semibold">{event.title}</span>
          {event.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-[#595959]">
              {event.description}
            </p>
          ) : null}
        </div>
      )
    },
    {
      key: "when",
      header: "When",
      render: (event) => (
        <span>
          {eventDateLabel(event.eventDate)}
          <br />
          {eventTimeLabel(event)}
        </span>
      )
    },
    {
      key: "type",
      header: "Type",
      render: (event) => eventTypeLabel(event.type)
    },
    {
      key: "status",
      header: "Status",
      render: (event) => (
        <span className="capitalize">{event.status}</span>
      )
    },
    {
      key: "location",
      header: "Location",
      render: (event) =>
        event.locationUrl ? (
          <a
            href={event.locationUrl}
            aria-label={
              event.location
                ? `${event.location} for ${event.title} (opens in a new tab)`
                : `Open event link for ${event.title} (opens in a new tab)`
            }
            rel="noopener noreferrer"
            target="_blank"
            className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {event.location || "Event link"}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          event.location || "-"
        )
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (event) => (
        <EventActions
          id={event.id}
          title={event.title}
          status={event.status}
        />
      )
    }
  ];

  return (
    <div className="space-y-8">
      <div className="wp-article">
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="mt-3 text-[#595959]">
          {items.length.toLocaleString()} event{items.length === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="wp-article">
        <h2 className="mb-4 text-2xl font-semibold">Add event</h2>
        <EventForm shareNetworks={shareNetworks} />
      </div>

      <div className="wp-article">
        <h2
          id="events-table-heading"
          tabIndex={-1}
          className="mb-4 text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          All events
        </h2>
        <ItemTable
          caption="All events"
          headingId="events-table"
          columns={columns}
          items={items}
          getItemKey={(event) => String(event.id)}
          emptyIcon={<CalendarDays className="h-10 w-10" aria-hidden="true" />}
          emptyTitle="No events yet"
          emptyMessage="Add the first event with the form above."
        />
      </div>
    </div>
  );
}
