import { ContentList } from "@/components/layout/content-list";
import { Sidebar } from "@/components/layout/sidebar";
import { getDirectoryEntries, getLatestPosts } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [reports, directory] = await Promise.all([
    getLatestPosts(10),
    getDirectoryEntries(5)
  ]);

  return (
    <div className="wp-container">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
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

          <ContentList title="Latest Posts" items={reports.slice(0, 6)} />
        </div>

        <Sidebar reports={reports} directory={directory} />
      </div>
    </div>
  );
}
