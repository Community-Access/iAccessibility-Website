"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DIRECTORY_CATEGORIES, DIRECTORY_PLATFORMS } from "@/lib/content/wordpress";

const RATINGS = [
  "5 - Fully Accessible",
  "4 - Mostly Accessible",
  "3 - Average",
  "2 - Needs Work",
  "1 - Not Accessible"
];

export function DirectorySubmissionForm() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const response = await fetch("/api/submissions/directory", {
      method: "POST",
      body: new FormData(event.currentTarget)
    });
    const payload = await response.json().catch(() => ({}));

    setLoading(false);

    if (response.ok) {
      event.currentTarget.reset();
      setStatus("Your app submission was sent to the review queue.");
    } else {
      setStatus(payload.error || "The app submission could not be saved.");
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="app-name" label="App Name" required>
          <Input id="app-name" name="appName" required autoComplete="off" />
        </FormField>
        <FormField id="app-version" label="App Version" required>
          <Input id="app-version" name="appVersion" required autoComplete="off" />
        </FormField>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="platform" label="Platform" required>
          <Select id="platform" name="platform" required defaultValue="">
            <option value="" disabled>
              Select a platform
            </option>
            {DIRECTORY_PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="category" label="Category" required>
          <Select id="category" name="category" required defaultValue="">
            <option value="" disabled>
              Select a category
            </option>
            {DIRECTORY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField
        id="app-description"
        label="App Description"
        description="Try copying the app description from the App Store."
        required
      >
        <Textarea id="app-description" name="description" required maxLength={4000} />
      </FormField>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="paid-status" label="Free or Paid" required>
          <Select id="paid-status" name="paidStatus" required defaultValue="">
            <option value="" disabled>
              Select one
            </option>
            <option value="Free">Free</option>
            <option value="Paid">Paid</option>
          </Select>
        </FormField>
        <FormField id="price" label="Price">
          <Input id="price" name="price" inputMode="decimal" />
        </FormField>
      </div>
      <FormField
        id="tested-devices"
        label="Devices you've tested on?"
        description="Describe what devices you tested this app on."
        required
      >
        <Input id="tested-devices" name="testedDevices" required />
      </FormField>
      <FormField
        id="accessibility-rating"
        label="Accessibility Rating"
        description="Please rate this app between 1 and 5."
      >
        <Select id="accessibility-rating" name="accessibilityRating" defaultValue="">
          <option value="">No rating</option>
          {RATINGS.map((rating) => (
            <option key={rating} value={rating}>
              {rating}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="accessibility-comments" label="Accessibility Comments" required>
        <Textarea id="accessibility-comments" name="accessibilityComments" required />
      </FormField>
      <FormField id="screen-reader-performance" label="Screen Reader performance" required>
        <Textarea id="screen-reader-performance" name="screenReaderPerformance" required />
      </FormField>
      <FormField
        id="button-labeling"
        label="Button Labeling"
        description="Describe if any buttons are unlabeled in this app."
        required
      >
        <Textarea id="button-labeling" name="buttonLabeling" required />
      </FormField>
      <FormField id="usability" label="Usability" required>
        <Textarea id="usability" name="usability" required />
      </FormField>
      <FormField
        id="low-vision-comments"
        label="Low Vision Accessibility Comments"
      >
        <Textarea id="low-vision-comments" name="lowVisionComments" />
      </FormField>
      <FormField id="other-comments" label="Other Comments">
        <Textarea id="other-comments" name="otherComments" />
      </FormField>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField id="app-store-link" label="App Store Link" required>
          <Input id="app-store-link" name="appStoreUrl" type="url" required />
        </FormField>
        <FormField id="developer-website" label="Developer Website" required>
          <Input id="developer-website" name="websiteUrl" type="url" required />
        </FormField>
      </div>
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
  );
}
