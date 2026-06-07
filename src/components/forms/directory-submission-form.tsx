"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Search } from "lucide-react";
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

type AppStoreResult = {
  itunesAppId: string;
  appName: string;
  developerName: string;
  description: string;
  appVersion: string;
  category: string;
  iconUrl: string;
  appStoreUrl: string;
  websiteUrl: string;
  paidStatus: "Free" | "Paid";
  price: string;
  bundleId: string;
  contentRating: string;
  minimumOsVersion: string;
  accessibilityNutritionLabels: string[];
  accessibilityNutritionLabelSource: string;
};

type DirectorySubmissionFormProps = {
  categories?: string[];
};

type FormElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const CATEGORY_ALIASES: Record<string, string> = {
  "food & drink": "food and drink",
  "graphics & design": "graphics and design",
  "health & fitness": "health and fitness",
  "photo & video": "photo and video",
  "social networking": "social networking"
};

function normalizeCategoryName(value: string) {
  const normalized = value.trim().toLowerCase().replace(/&/g, "and");
  return CATEGORY_ALIASES[normalized] ?? normalized;
}

function categoryValue(appStoreCategory: string, categories: string[]) {
  const normalized = normalizeCategoryName(appStoreCategory);
  if (!normalized) return "";

  return (
    categories.find((category) => normalizeCategoryName(category) === normalized) ||
    categories.find((category) =>
      normalizeCategoryName(category).endsWith(`: ${normalized}`)
    ) ||
    categories.find((category) =>
      normalizeCategoryName(category).includes(normalized)
    ) ||
    ""
  );
}

export function DirectorySubmissionForm({
  categories = DIRECTORY_CATEGORIES
}: DirectorySubmissionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [appName, setAppName] = useState("");
  const [status, setStatus] = useState<string>("");
  const [lookupStatus, setLookupStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [results, setResults] = useState<AppStoreResult[]>([]);
  const [selected, setSelected] = useState<AppStoreResult | null>(null);

  function setField(name: string, value: string | null | undefined) {
    const field = formRef.current?.elements.namedItem(name) as FormElement | null;
    if (field) field.value = value ?? "";
  }

  async function searchAppStore() {
    const query = appName.trim();
    if (query.length < 2) {
      setLookupStatus("Enter at least two characters before searching.");
      return;
    }

    setLookupLoading(true);
    setLookupStatus("Searching the App Store.");
    setResults([]);

    try {
      const response = await fetch(
        `/api/app-store/search?q=${encodeURIComponent(query)}`,
        { cache: "no-store" }
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setLookupStatus(payload.error || "The App Store search failed.");
        return;
      }

      const apps = (payload.results ?? []) as AppStoreResult[];
      setResults(apps);
      setLookupStatus(
        apps.length === 0
          ? "No matching apps were found."
          : `Found ${apps.length} app${apps.length === 1 ? "" : "s"}. Choose one to autofill.`
      );
    } catch {
      setLookupStatus("The App Store search failed.");
    } finally {
      setLookupLoading(false);
    }
  }

  function applyApp(app: AppStoreResult) {
    setSelected(app);
    setAppName(app.appName);
    setField("appName", app.appName);
    setField("appVersion", app.appVersion);
    setField("platform", "iOS/iPadOS");
    setField("category", categoryValue(app.category, categories));
    setField("description", app.description);
    setField("paidStatus", app.paidStatus);
    setField("price", app.price === "Free" ? "" : app.price);
    setField("appStoreUrl", app.appStoreUrl);
    setField("websiteUrl", app.websiteUrl);
    setField("itunesAppId", app.itunesAppId);
    setField("iconUrl", app.iconUrl);
    setField(
      "accessibilityNutritionLabels",
      app.accessibilityNutritionLabels.join(", ")
    );
    setLookupStatus(`${app.appName} details were added to the form.`);
  }

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
      setAppName("");
      setResults([]);
      setSelected(null);
      setLookupStatus("");
      setStatus("Your app submission was sent to the review queue.");
    } else {
      setStatus(payload.error || "The app submission could not be saved.");
    }
  }

  return (
    <form ref={formRef} className="space-y-5" onSubmit={onSubmit}>
      <input type="hidden" name="itunesAppId" />
      <input type="hidden" name="iconUrl" />
      <input type="hidden" name="accessibilityNutritionLabels" />

      <div className="rounded-md border border-border bg-[#eef3f8] p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <FormField
            id="app-name"
            label="App Name"
            description="Type an app name, then search the App Store to autofill metadata."
            required
          >
            <Input
              id="app-name"
              name="appName"
              value={appName}
              onChange={(event) => setAppName(event.target.value)}
              required
              autoComplete="off"
            />
          </FormField>
          <Button
            type="button"
            onClick={searchAppStore}
            disabled={lookupLoading || appName.trim().length < 2}
            aria-describedby="app-lookup-status"
          >
            {lookupLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            Search App Store
          </Button>
        </div>

        <p
          id="app-lookup-status"
          role="status"
          aria-live="polite"
          className="mt-3 text-sm font-medium"
        >
          {lookupStatus}
        </p>

        {results.length > 0 ? (
          <section
            className="mt-4"
            aria-labelledby="app-store-results-heading"
          >
            <h2 id="app-store-results-heading" className="text-lg font-semibold">
              App Store Results
            </h2>
            <ul className="mt-3 grid gap-3">
              {results.map((app) => (
                <li key={app.itunesAppId || app.appStoreUrl}>
                  <button
                    type="button"
                    onClick={() => applyApp(app)}
                    className="flex w-full items-start gap-3 rounded-md border border-border bg-white p-3 text-left hover:border-[#1e73be] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#035a9e]"
                  >
                    {app.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={app.iconUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : null}
                    <span className="min-w-0">
                      <span className="block font-semibold">{app.appName}</span>
                      <span className="block text-sm text-[#595959]">
                        {app.developerName || "Unknown developer"}
                      </span>
                      <span className="block text-sm text-[#595959]">
                        {[app.category, app.price].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {selected ? (
          <section
            className="mt-4 rounded-md border border-border bg-white p-3"
            aria-labelledby="nutrition-labels-heading"
          >
            <h2
              id="nutrition-labels-heading"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <CheckCircle2 className="h-5 w-5 text-[#035a9e]" aria-hidden="true" />
              Accessibility Nutrition Labels
            </h2>
            {selected.accessibilityNutritionLabels.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {selected.accessibilityNutritionLabels.map((label) => (
                  <li
                    key={label}
                    className="rounded-full bg-[#eef3f8] px-3 py-1 text-sm"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[#595959]">
                Apple did not return public accessibility labels for this app.
                Complete the review fields below from your own testing.
              </p>
            )}
          </section>
        ) : null}
      </div>

      <FormField id="app-version" label="App Version" required>
        <Input id="app-version" name="appVersion" required autoComplete="off" />
      </FormField>

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
            {categories.map((category) => (
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
        description="Autofill can add the App Store description; edit it if needed."
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
        <FormField id="developer-website" label="Developer Website">
          <Input id="developer-website" name="websiteUrl" type="url" />
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
