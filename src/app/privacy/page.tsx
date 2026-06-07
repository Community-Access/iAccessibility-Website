import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How iAccessibility collects, uses, and protects your information."
};

export default function PrivacyPage() {
  return (
    <div className="wp-container">
      <article className="wp-article wp-prose">
        <h1>Privacy Policy</h1>
        <p>
          This policy explains what information iAccessibility collects, how it
          is used, and the choices you have. We aim to collect only what we need
          to run the community.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>
            <strong>Account information.</strong> When you create an account we
            store your email address and display name so you can sign in and
            submit content.
          </li>
          <li>
            <strong>Submissions.</strong> Content you submit (Report articles,
            App Directory entries, and audio) is stored so our team can review
            and publish it.
          </li>
          <li>
            <strong>Essential cookies.</strong> We use cookies that are required
            to keep you signed in. Analytics cookies only load after you accept
            them in the cookie banner.
          </li>
        </ul>

        <h2>How we use your information</h2>
        <ul>
          <li>To provide your account and publish content you submit.</li>
          <li>
            To send transactional email about your account and submissions (for
            example, a confirmation when you submit, or a decision when it is
            reviewed).
          </li>
          <li>To keep the community safe and to respond to your requests.</li>
        </ul>

        <h2>Service providers</h2>
        <p>
          We use trusted providers to operate the site: Neon (database),
          DigitalOcean (hosting and media storage), and Amazon Web Services
          (email delivery). These providers process data only to provide their
          service to us.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>You can decline non-essential (analytics) cookies at any time.</li>
          <li>
            You can request that we update or delete your account information by
            contacting us.
          </li>
        </ul>

        <h2>Contact</h2>
        <p>
          Questions about this policy? Email{" "}
          <a href="mailto:support@iaccessibility.net">
            support@iaccessibility.net
          </a>
          .
        </p>
      </article>
    </div>
  );
}
