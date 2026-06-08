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

export function ReportSubmissionForm() {
  const [status, setStatus] = useState<SubmissionStatus>({
    tone: "idle",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus({ tone: "idle", message: "" });

    const response = await fetch("/api/submissions/report", {
      method: "POST",
      body: new FormData(event.currentTarget)
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.ok) {
      event.currentTarget.reset();
      setStatus({
        tone: "success",
        message: "Your report was submitted for review."
      });
    } else {
      setStatus({
        tone: "error",
        message: payload.error || "The report could not be submitted."
      });
    }
  }

  return (
    <div id="submit-report" className="wp-article">
      <h2 id="submit-report-heading" className="mb-4 text-2xl font-semibold">
        Submit To The Report
      </h2>
      <form className="space-y-5" onSubmit={onSubmit}>
        <FormField id="report-title" label="Report Title">
          <Input id="report-title" name="title" autoComplete="off" />
        </FormField>
        <FormField id="report-content" label="Report Content" required>
          <Textarea id="report-content" name="content" required rows={9} />
        </FormField>
        <FormField id="report-image" label="Post Image">
          <Input
            id="report-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/gif"
          />
        </FormField>
        <FormField
          id="report-image-alt"
          label="Image description (alt text)"
          description="Required when the uploaded image adds meaning to the report."
        >
          <Input
            id="report-image-alt"
            name="imageAlt"
            autoComplete="off"
            placeholder="Describe what the image shows"
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="imageDecorative"
            value="true"
            className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
          />
          The uploaded image is decorative
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Submit for review
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
