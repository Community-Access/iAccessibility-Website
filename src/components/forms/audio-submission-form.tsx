"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SubmissionStatus = {
  tone: "idle" | "success" | "error";
  message: string;
};

export function AudioSubmissionForm() {
  const [status, setStatus] = useState<SubmissionStatus>({
    tone: "idle",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus({ tone: "idle", message: "" });

    const response = await fetch("/api/submissions/audio", {
      method: "POST",
      body: new FormData(event.currentTarget)
    });
    const payload = await response.json().catch(() => ({}));

    setLoading(false);

    if (response.ok) {
      event.currentTarget.reset();
      setStatus({
        tone: "success",
        message: "Your audio content was submitted for media-team review."
      });
    } else {
      setStatus({
        tone: "error",
        message: payload.error || "The audio submission could not be sent."
      });
    }
  }

  return (
    <div className="wp-article">
      <h2 id="audio-submission-heading" className="mb-4 text-2xl font-semibold">
        Submit Audio Content
      </h2>
      <form className="space-y-5" onSubmit={onSubmit}>
        <FormField
          id="episode-title"
          label="Episode Title"
          description="Let us know the title of your content."
          required
        >
          <Input id="episode-title" name="title" required />
        </FormField>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField id="first-name" label="First name" required>
            <Input id="first-name" name="firstName" required autoComplete="given-name" />
          </FormField>
          <FormField id="last-name" label="Last name" required>
            <Input id="last-name" name="lastName" required autoComplete="family-name" />
          </FormField>
        </div>
        <FormField
          id="content-description"
          label="Content Description"
          description="Describe your audio content, or leave show notes."
          required
        >
          <Textarea id="content-description" name="description" required rows={7} />
        </FormField>
        <FormField id="media-file" label="Media File" required>
          <Input
            id="media-file"
            name="media"
            type="file"
            required
            accept="audio/wav,audio/mpeg,audio/mp4,audio/flac,.wav,.mp3,.m4a,.flac"
          />
        </FormField>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Submit audio
        </Button>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={
            status.tone === "success"
              ? "text-sm font-medium text-[#166534]"
              : "sr-only"
          }
        >
          {status.tone === "success" ? status.message : ""}
        </p>
        <p
          role="alert"
          aria-atomic="true"
          className={
            status.tone === "error"
              ? "text-sm font-medium text-[#b91c1c]"
              : "sr-only"
          }
        >
          {status.tone === "error" ? status.message : ""}
        </p>
      </form>
    </div>
  );
}
