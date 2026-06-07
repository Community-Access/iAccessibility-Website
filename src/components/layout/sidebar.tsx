import Link from "next/link";
import type {
  ContentSummary,
  DirectoryEntrySummary
} from "@/lib/content/wordpress";

type SidebarProps = {
  reports: ContentSummary[];
  directory: DirectoryEntrySummary[];
};

export function Sidebar({ reports, directory }: SidebarProps) {
  return (
    <aside className="space-y-8" aria-label="Sidebar">
      <section
        className="rounded-lg bg-white p-5 shadow-wordpress"
        aria-labelledby="sidebar-reports-heading"
      >
        <h2
          id="sidebar-reports-heading"
          className="mb-3 border-b border-[#d4d4d4] pb-2 text-lg font-semibold"
        >
          Recent Reports
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-[#595959]">
            <Link href="/report">Read the iAccessibility Report</Link>
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {reports.map((report) => (
              <li key={`${report.id}-${report.slug}`}>
                <Link href={report.href}>{report.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="rounded-lg bg-white p-5 shadow-wordpress"
        aria-labelledby="sidebar-directory-heading"
      >
        <h2
          id="sidebar-directory-heading"
          className="mb-3 border-b border-[#d4d4d4] pb-2 text-lg font-semibold"
        >
          Latest From The Directory
        </h2>
        {directory.length === 0 ? (
          <p className="text-sm text-[#595959]">
            <Link href="/app-directory">Browse the App Directory</Link>
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {directory.map((entry) => (
              <li key={`${entry.id}-${entry.slug}`}>
                <Link href="/app-directory">{entry.appName}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
