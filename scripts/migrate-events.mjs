// WordPress My Calendar -> custom events migration.
//
// Imports legacy `mc-events` posts and `_mc_event_data` metadata from the private
// WordPress export into the custom `events` table. This intentionally does not
// depend on the old My Calendar route, shortcodes, or plugin tables at runtime.
//
// Usage:
//   node scripts/migrate-events.mjs --dry
//   node scripts/migrate-events.mjs
//   node scripts/migrate-events.mjs --include-demo
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const EXPORT = "migration/wordpress-export";
const DRY = process.argv.includes("--dry");
const INCLUDE_DEMO = process.argv.includes("--include-demo");

const env = readFileSync(".env.local", "utf8");
const dbUrl = (env.match(/^DATABASE_URL=(.+)$/m) || [])[1]?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const sql = neon(dbUrl);

const posts = JSON.parse(
  readFileSync(`${EXPORT}/wp-podcast-events-buddypress.json`, "utf8")
);
const metaSql = readFileSync(`${EXPORT}/postmeta-comments.sql`, "utf8");

function unescapeSql(value) {
  return value
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

function metaMap(key) {
  const map = new Map();
  const re = new RegExp(`\\(\\d+,(\\d+),'${key}','((?:[^'\\\\]|\\\\.)*)'\\)`, "g");
  for (const match of metaSql.matchAll(re)) {
    map.set(match[1], unescapeSql(match[2]));
  }
  return map;
}

class PhpSerializedParser {
  constructor(value) {
    this.buffer = Buffer.from(value, "utf8");
    this.offset = 0;
  }

  byte() {
    return String.fromCharCode(this.buffer[this.offset]);
  }

  expect(value) {
    for (const char of value) {
      if (this.byte() !== char) {
        throw new Error(`Expected "${value}" at byte ${this.offset}.`);
      }
      this.offset += 1;
    }
  }

  readUntil(char) {
    const start = this.offset;
    const code = char.charCodeAt(0);
    while (this.offset < this.buffer.length && this.buffer[this.offset] !== code) {
      this.offset += 1;
    }
    const value = this.buffer.slice(start, this.offset).toString("utf8");
    this.expect(char);
    return value;
  }

  parse() {
    const type = this.byte();
    if (type === "N") {
      this.expect("N;");
      return null;
    }
    if (type === "i") {
      this.expect("i:");
      return Number(this.readUntil(";"));
    }
    if (type === "b") {
      this.expect("b:");
      return this.readUntil(";") === "1";
    }
    if (type === "s") {
      this.expect("s:");
      const byteLength = Number(this.readUntil(":"));
      this.expect('"');
      const start = this.offset;
      this.offset += byteLength;
      const value = this.buffer.slice(start, this.offset).toString("utf8");
      this.expect('";');
      return value;
    }
    if (type === "a") {
      this.expect("a:");
      const count = Number(this.readUntil(":"));
      this.expect("{");
      const entries = [];
      for (let index = 0; index < count; index += 1) {
        entries.push([this.parse(), this.parse()]);
      }
      this.expect("}");
      const allNumeric = entries.every(([key]) => Number.isInteger(key));
      if (allNumeric) {
        const arr = [];
        for (const [key, value] of entries) arr[key] = value;
        return arr;
      }
      return Object.fromEntries(entries);
    }
    throw new Error(`Unsupported PHP serialized type "${type}" at byte ${this.offset}.`);
  }
}

function phpUnserialize(value) {
  return new PhpSerializedParser(value).parse();
}

function slugify(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function stripHtml(value) {
  return (value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function timeValue(value, fallback = "12:00") {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : fallback;
}

function firstUrl(value) {
  return String(value || "").match(/https?:\/\/\S+/)?.[0]?.replace(/[).,]+$/, "") || "";
}

function eventType(title) {
  const value = title.toLowerCase();
  if (value.includes("call") || value.includes("meeting")) return "meeting";
  if (value.includes("workshop")) return "workshop";
  if (value.includes("conference")) return "conference";
  if (value.includes("stream") || value.includes("live")) return "stream";
  return "custom";
}

function dateParts(date) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function dateValue(date) {
  const { year, month, day } = dateParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonthsClamped(date, months) {
  const day = date.getUTCDate();
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
  ).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

function nthWeekdayOfMonth(year, monthIndex, weekday, ordinal) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const delta = (weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + delta + (ordinal - 1) * 7;
  const candidate = new Date(Date.UTC(year, monthIndex, day));
  if (candidate.getUTCMonth() !== monthIndex) {
    return null;
  }
  return candidate;
}

function recurrenceDates(data) {
  const start = dateValue(data.event_begin);
  const until = data.event_repeats ? dateValue(data.event_repeats) : start;
  const code = String(data.event_recur || "S1");
  const kind = code.charAt(0);
  const interval = Math.max(1, Number(code.slice(1)) || 1);
  const dates = [];

  if (!data.event_repeats || kind === "S") return [data.event_begin];

  if (kind === "D" || kind === "W") {
    const step = kind === "D" ? interval : interval * 7;
    for (let current = start; current <= until; current = addDays(current, step)) {
      dates.push(isoDate(current));
    }
    return dates;
  }

  if (kind === "M") {
    for (let current = start; current <= until; current = addMonthsClamped(current, interval)) {
      dates.push(isoDate(current));
    }
    return dates;
  }

  if (kind === "U") {
    const weekday = start.getUTCDay();
    const ordinal = Math.ceil(start.getUTCDate() / 7);
    for (
      let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      cursor <= until;
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + interval, 1))
    ) {
      const occurrence = nthWeekdayOfMonth(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        weekday,
        ordinal
      );
      if (occurrence && occurrence >= start && occurrence <= until) {
        dates.push(isoDate(occurrence));
      }
    }
    return dates;
  }

  if (kind === "Y") {
    for (
      let current = start;
      current <= until;
      current = new Date(
        Date.UTC(current.getUTCFullYear() + interval, current.getUTCMonth(), current.getUTCDate())
      )
    ) {
      dates.push(isoDate(current));
    }
    return dates;
  }

  return [data.event_begin];
}

const eventDataByPost = metaMap("_mc_event_data");
const rows = [];
const skipped = [];

for (const post of posts.filter((item) => item.post_type === "mc-events")) {
  const raw = eventDataByPost.get(String(post.ID));
  if (!raw) {
    skipped.push(`${post.ID}: missing _mc_event_data`);
    continue;
  }

  const data = phpUnserialize(raw);
  const title = data.event_title || post.post_title || "Untitled event";
  if (!INCLUDE_DEMO && /^demo:/i.test(title)) {
    skipped.push(`${post.ID}: skipped demo event "${title}"`);
    continue;
  }

  const description = stripHtml(data.event_desc || post.post_content || "");
  const link = data.event_link || firstUrl(data.event_desc || post.post_content);
  const approved = data.event_approved === 1 || data.event_approved === "1";

  const dates = recurrenceDates(data);
  dates.forEach((date, index) => {
    rows.push({
      title,
      slug:
        index === 0
          ? `${slugify(title) || "event"}-wp-${post.ID}`
          : `${slugify(title) || "event"}-wp-${post.ID}-${date}`,
      description: description || data.event_short || null,
      event_date: date,
      start_time: timeValue(data.event_time),
      end_time: data.event_endtime ? timeValue(data.event_endtime) : null,
      timezone: "America/Chicago",
      type: eventType(title),
      location: data.event_location || (link ? "Online" : null),
      location_url: link || null,
      status: approved && post.post_status === "publish" ? "published" : "draft"
    });
  });
}

console.log(`Events ready to import: ${rows.length}`);
for (const event of rows) {
  console.log(`- ${event.event_date} ${event.start_time} ${event.title}`);
}
if (skipped.length) {
  console.log(`Skipped: ${skipped.length}`);
  for (const item of skipped) console.log(`- ${item}`);
}

if (DRY) {
  console.log("DRY RUN — no database writes.");
  process.exit(0);
}

const columns = [
  "title",
  "slug",
  "description",
  "event_date",
  "start_time",
  "end_time",
  "timezone",
  "type",
  "location",
  "location_url",
  "status"
];

for (const row of rows) {
  await sql.query(
    `INSERT INTO events (${columns.join(",")})
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::content_status)
     ON CONFLICT (slug) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       event_date = EXCLUDED.event_date,
       start_time = EXCLUDED.start_time,
       end_time = EXCLUDED.end_time,
       timezone = EXCLUDED.timezone,
       type = EXCLUDED.type,
       location = EXCLUDED.location,
       location_url = EXCLUDED.location_url,
       status = EXCLUDED.status,
       updated_at = now()`,
    columns.map((column) => row[column])
  );
}

console.log(`Imported ${rows.length} event${rows.length === 1 ? "" : "s"}.`);
