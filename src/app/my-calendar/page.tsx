import { redirect } from "next/navigation";

export default async function LegacyCalendarRedirect({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  redirect(month ? `/events?month=${encodeURIComponent(month)}` : "/events");
}
