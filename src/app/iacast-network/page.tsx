import { AudioSubmissionForm } from "@/components/forms/audio-submission-form";
import { getLatestPodcastEpisodes } from "@/lib/content/wordpress";
import { dateLabel } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function IACastPage() {
  const episodes = await getLatestPodcastEpisodes(12);

  return (
    <div className="wp-container space-y-8">
      <section className="wp-article text-center">
        <h1 className="text-3xl font-bold">iACast Network</h1>
        <p className="mx-auto mt-4 max-w-3xl text-lg">
          Listen to the latest iACast Network episodes and submit audio content
          for media-team review.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="wp-article" aria-labelledby="episodes-heading">
          <h2 id="episodes-heading" className="mb-4 text-2xl font-semibold">
            Latest iACast Network Episodes
          </h2>
          <div className="grid gap-4">
            {episodes.map((episode) => (
              <article
                key={`${episode.id}-${episode.slug}`}
                className="rounded-lg border border-border p-4"
              >
                <h3 className="text-lg font-semibold">{episode.title}</h3>
                {episode.date ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    <time dateTime={episode.date}>{dateLabel(episode.date)}</time>
                  </p>
                ) : null}
                {episode.showNotes ? <p className="mt-3">{episode.showNotes}</p> : null}
                {episode.enclosureUrl ? (
                  <>
                    <audio className="mt-4 w-full" controls src={episode.enclosureUrl}>
                      <a href={episode.enclosureUrl}>
                        Download episode: {episode.title}
                      </a>
                    </audio>
                    <p className="mt-2">
                      <a href={episode.enclosureUrl}>
                        Download episode: {episode.title}
                      </a>
                    </p>
                  </>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <AudioSubmissionForm />
      </div>
    </div>
  );
}
