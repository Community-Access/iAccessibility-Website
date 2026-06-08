import Link from "next/link";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import { ContentList } from "@/components/layout/content-list";
import {
  getDirectoryEntries,
  getLatestPodcastEpisodes,
  getLatestPosts
} from "@/lib/content/wordpress";
import { durationSpoken, formatDate, formatDuration } from "@/lib/utils";
import { PODCASTS_PUBLIC_ENABLED } from "@/lib/flags";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [reports, directory, episodes] = await Promise.all([
    getLatestPosts(10),
    getDirectoryEntries().then((rows) => rows.slice(0, 5)),
    getLatestPodcastEpisodes(5)
  ]);

  return (
    <div className="wp-container">
      <div className="space-y-8">
          <section className="wp-article">
            <h1 className="text-[31px] font-bold leading-tight tracking-normal md:text-[36px]">
              Welcome to iAccessibility
            </h1>
            <p className="mt-4">
              Welcome to iAccessibility, your community for all things related
              to technology and accessibility! We&rsquo;re dedicated to providing
              an approachable community for everyone so that you can enjoy your
              digital devices to the fullest. Making Success Accessible is our
              mission and our passion.
            </p>
            <h2 className="mt-6 text-[27px] font-bold leading-tight">
              Explore Our Community Offerings
            </h2>
            <ul className="mt-4 list-disc space-y-3 pl-6">
              <li>
                <strong>iACast Network of Podcasts:</strong> Dive into the
                iACast Network, where we host a series of engaging podcasts
                that cover a wide range of topics related to technology. on
                iOS. Tune in to hear from experts, enthusiasts, and everyday
                users as they share insights, experiences, and tips on
                navigating the accessible app world.
              </li>
              <li>
                <strong>The iAccessibility Report:</strong> Stay informed with
                the iAccessibility report, where we review accessibility-related
                products. Whether you&rsquo;re looking for the latest accessible
                apps or the most user-friendly devices, our in-depth analysis
                and honest opinions will help you make informed decisions.
              </li>
              <li>
                <strong>App Directories:</strong> Use the App directories to
                find information regarding the accessibility of apps on many
                popular technology platforms. Submit apps that you use so that
                others can know if an app is accessible.
              </li>
            </ul>
            <h2 className="mt-6 text-[27px] font-bold leading-tight">
              Why iAccessibility?
            </h2>
            <p className="mt-4">
              At iAccessibility, we believe in the power of community and the
              importance of app accessibility for all. Our mission is to provide
              valuable resources, foster engaging conversations, and promote the
              latest advancements in accessible technology. Whether you&rsquo;re new
              to technology or a seasoned technology user, iAccessibility is
              here to support and empower you on your journey.
            </p>
          </section>

          <ContentList
            title="Latest Posts"
            items={reports.slice(0, 6)}
            viewAllHref="/blog"
            viewAllLabel="View all posts"
          />

          {PODCASTS_PUBLIC_ENABLED && episodes.length > 0 ? (
            <section>
              <h2 className="mb-4 text-2xl font-semibold">
                Latest iACast Episodes
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {episodes.map((episode) => {
                  const duration = formatDuration(episode.durationSeconds);
                  const spoken = durationSpoken(episode.durationSeconds);
                  return (
                    <article
                      key={`${episode.id}-${episode.slug}`}
                      className="overflow-hidden rounded-lg border border-border bg-white shadow-wordpress"
                    >
                      <BrandedMediaFrame
                        src={episode.image}
                        alt=""
                        decorative
                        className="aspect-[16/10]"
                        fallbackLabel="iACast"
                      />
                      <div className="p-4">
                        <h3 className="text-lg font-semibold">
                          <Link
                            href={`/iacast-network/${episode.slug}`}
                            className="text-[#0f6cba] underline underline-offset-2 hover:text-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded"
                          >
                            {episode.title}
                          </Link>
                        </h3>
                        {episode.date || duration ? (
                          <p className="mt-3 text-sm text-[#595959]">
                            {episode.date ? (
                              <time dateTime={episode.date}>
                                {formatDate(episode.date)}
                              </time>
                            ) : null}
                            {duration ? (
                              <span>
                                {episode.date ? " · " : ""}
                                <span aria-hidden="true">{duration}</span>
                                <span className="sr-only">{spoken}</span>
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="mt-5">
                <Link
                  href="/iacast-network"
                  className="font-semibold text-[#0f6cba] underline underline-offset-2 hover:text-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded"
                >
                  View all podcasts
                </Link>
              </p>
            </section>
          ) : null}

          {directory.length > 0 ? (
            <section>
              <h2 className="mb-4 text-2xl font-semibold">
                Latest App Directory Entries
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {directory.slice(0, 6).map((entry) => (
                  <article
                    key={`${entry.id}-${entry.slug}`}
                    className="overflow-hidden rounded-lg border border-border bg-white shadow-wordpress"
                  >
                    <BrandedMediaFrame
                      src={entry.iconUrl}
                      alt=""
                      decorative
                      className="aspect-[16/10]"
                      fallbackLabel="App Directory"
                    />
                    <div className="p-4">
                      <h3 className="text-lg font-semibold">{entry.appName}</h3>
                      {entry.description ? (
                        <p className="mt-3 text-sm text-[#595959]">
                          {entry.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              <p className="mt-5">
                <Link
                  href="/app-directory"
                  className="font-semibold text-[#0f6cba] underline underline-offset-2 hover:text-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded"
                >
                  View all directory entries
                </Link>
              </p>
            </section>
          ) : null}
      </div>
    </div>
  );
}
