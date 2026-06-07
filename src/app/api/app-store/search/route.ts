import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ACCESSIBILITY_LABELS = [
  "VoiceOver",
  "Voice Control",
  "Larger Text",
  "Sufficient Contrast",
  "Reduced Motion",
  "Captions",
  "Audio Descriptions",
  "Dark Interface",
  "Differentiate Without Color Alone",
  "Switch Control"
];

type ItunesSearchResult = {
  trackId?: number;
  trackName?: string;
  sellerName?: string;
  artistName?: string;
  description?: string;
  version?: string;
  primaryGenreName?: string;
  genres?: string[];
  artworkUrl100?: string;
  artworkUrl512?: string;
  trackViewUrl?: string;
  sellerUrl?: string;
  formattedPrice?: string;
  price?: number;
  currency?: string;
  bundleId?: string;
  contentAdvisoryRating?: string;
  minimumOsVersion?: string;
};

type ItunesSearchResponse = {
  resultCount?: number;
  results?: ItunesSearchResult[];
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function findAccessibilityNutritionLabels(appStoreUrl?: string) {
  if (!appStoreUrl) {
    return { labels: [] as string[], source: "unavailable" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(appStoreUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 iAccessibility metadata lookup (+https://iaccessibility.net)"
      },
      next: { revalidate: 3600 }
    });
    clearTimeout(timeout);

    if (!response.ok) return { labels: [] as string[], source: "unavailable" };

    const html = await response.text();
    const labels = ACCESSIBILITY_LABELS.filter((label) =>
      html.toLowerCase().includes(label.toLowerCase())
    );

    return {
      labels,
      source: labels.length > 0 ? "app-store-page" : "unavailable"
    };
  } catch {
    return { labels: [] as string[], source: "unavailable" };
  }
}

function normalizeResult(
  result: ItunesSearchResult,
  nutrition: { labels: string[]; source: string }
) {
  const price =
    typeof result.price === "number" && result.price > 0
      ? result.formattedPrice || `${result.price} ${result.currency || ""}`.trim()
      : result.formattedPrice || "Free";

  return {
    itunesAppId: result.trackId ? String(result.trackId) : "",
    appName: stringValue(result.trackName),
    developerName: stringValue(result.sellerName || result.artistName),
    description: stringValue(result.description),
    appVersion: stringValue(result.version),
    category: stringValue(result.primaryGenreName || result.genres?.[0]),
    iconUrl: stringValue(result.artworkUrl512 || result.artworkUrl100),
    appStoreUrl: stringValue(result.trackViewUrl),
    websiteUrl: stringValue(result.sellerUrl),
    paidStatus: typeof result.price === "number" && result.price > 0 ? "Paid" : "Free",
    price,
    bundleId: stringValue(result.bundleId),
    contentRating: stringValue(result.contentAdvisoryRating),
    minimumOsVersion: stringValue(result.minimumOsVersion),
    accessibilityNutritionLabels: nutrition.labels,
    accessibilityNutritionLabelSource: nutrition.source
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const country = (searchParams.get("country") || "US").trim().slice(0, 2);

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Enter at least two characters to search the App Store." },
      { status: 400 }
    );
  }

  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", query);
  url.searchParams.set("country", country);
  url.searchParams.set("entity", "software");
  url.searchParams.set("limit", "8");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "The App Store search service is unavailable right now." },
      { status: 502 }
    );
  }

  const payload = (await response.json()) as ItunesSearchResponse;
  const results = payload.results ?? [];
  const nutrition = await Promise.all(
    results.map((result) => findAccessibilityNutritionLabels(result.trackViewUrl))
  );

  return NextResponse.json({
    results: results.map((result, index) => normalizeResult(result, nutrition[index]))
  });
}
