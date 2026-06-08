"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES, eventTypeLabel } from "@/lib/events";
import { createEvent, initialEventActionState } from "./actions";

function localDateValue() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export type ShareNetwork = { id: string; label: string; connected: boolean };

export function EventForm({
  shareNetworks
}: {
  shareNetworks: ShareNetwork[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const defaultDate = localDateValue();
  const [state, formAction, pending] = useActionState(
    createEvent,
    initialEventActionState
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      titleRef.current?.focus();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <p className="text-sm text-[#595959]">Fields marked with * are required.</p>
      <FormField id="event-title" label="Title" required>
        <Input
          id="event-title"
          ref={titleRef}
          name="title"
          required
          autoComplete="off"
        />
      </FormField>

      <div className="grid gap-5 md:grid-cols-3">
        <FormField id="event-date" label="Date" required>
          <Input
            id="event-date"
            name="eventDate"
            type="date"
            required
            defaultValue={defaultDate}
          />
        </FormField>
        <FormField id="event-start-time" label="Start time" required>
          <Input id="event-start-time" name="startTime" type="time" required />
        </FormField>
        <FormField id="event-end-time" label="End time">
          <Input id="event-end-time" name="endTime" type="time" />
        </FormField>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <FormField id="event-timezone" label="Timezone" required>
          <Select
            id="event-timezone"
            name="timezone"
            defaultValue="America/Chicago"
            required
          >
            <option value="America/Chicago">Central Time</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="UTC">UTC</option>
          </Select>
        </FormField>
        <FormField id="event-type" label="Type" required>
          <Select id="event-type" name="type" defaultValue="stream" required>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {eventTypeLabel(type)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="event-status" label="Status" required>
          <Select id="event-status" name="status" defaultValue="published" required>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="event-location" label="Location">
          <Input
            id="event-location"
            name="location"
            placeholder="YouTube, Zoom, online, or venue"
          />
        </FormField>
        <FormField id="event-location-url" label="Event URL">
          <Input
            id="event-location-url"
            name="locationUrl"
            type="url"
            placeholder="https://"
          />
        </FormField>
      </div>

      <FormField id="event-description" label="Description">
        <Textarea id="event-description" name="description" rows={5} />
      </FormField>

      <fieldset className="space-y-3 rounded-lg border border-[#767676] p-4">
        <legend className="px-1 text-sm font-semibold text-[#222222]">
          Share to social media
        </legend>
        <p id="event-share-hint" className="text-sm text-[#595959]">
          Optional. Selected networks are posted when a published event is
          saved.
        </p>
        <div className="space-y-2">
          {shareNetworks.map((network) => (
            <div key={network.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                id={`event-share-${network.id}`}
                name="networks"
                value={network.id}
                disabled={!network.connected}
                className="mt-1 h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <label
                htmlFor={`event-share-${network.id}`}
                className={network.connected ? "" : "text-[#595959]"}
              >
                {network.label}
                {network.connected ? "" : " — Not connected yet"}
              </label>
            </div>
          ))}
        </div>
        <FormField
          id="event-share-note"
          label="Custom note"
          description="Optional. Added above the event link in each post. Up to 280 characters."
        >
          <Textarea
            id="event-share-note"
            name="shareNote"
            rows={3}
            maxLength={280}
          />
        </FormField>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {pending ? "Saving..." : "Save event"}
        </Button>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={
            state.status === "success"
              ? "text-sm font-semibold text-[#166534]"
              : "sr-only"
          }
        >
          {state.status === "success" ? state.message : ""}
        </p>
        <p
          role="alert"
          aria-atomic="true"
          className={
            state.status === "error"
              ? "text-sm font-semibold text-[#b91c1c]"
              : "sr-only"
          }
        >
          {state.status === "error" ? state.message : ""}
        </p>
      </div>
    </form>
  );
}
