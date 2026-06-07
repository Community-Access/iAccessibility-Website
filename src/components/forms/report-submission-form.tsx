"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ReportSubmissionForm() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const response = await fetch("/api/submissions/report", {
      method: "POST",
      body: new FormData(event.currentTarget)
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.ok) {
      event.currentTarget.reset();
      setStatus("Your report was submitted for review.");
    } else {
      setStatus(payload.error || "The report could not be submitted.");
    }
  }

  return (
    <section id="submit-report" className="wp-article" aria-labelledby="submit-report-heading">
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
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Submit for review
        </Button>
        {status ? (
          <p role="status" aria-live="polite" className="text-sm font-medium">
            {status}
          </p>
        ) : null}
      </form>
    </section>
  );
}
