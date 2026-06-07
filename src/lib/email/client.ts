import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { absoluteUrl, escapeHtml } from "@/lib/utils";

const FROM_NAME = "iAccessibility";
const SUPPORT_EMAIL = "support@iaccessibility.net";

// Brand palette (light-only, WCAG AA verified by accessibility-lead):
//   CTA bg #0066bf + white text = 5.17:1
//   link  #0f6cba on white       = 4.72:1
//   body  #222222 on white       = 15.9:1
//   muted #6b7280 on white       = 4.83:1
const COLOR = {
  cta: "#0066bf",
  link: "#0f6cba",
  body: "#222222",
  muted: "#595959",
  panel: "#f3f4f6",
  border: "#d4d4d4"
} as const;

export type EmailContent = { subject: string; html: string; text: string };

function fromEmail() {
  return process.env.SES_FROM_EMAIL || "techopolis@techopolisonline.com";
}

function reviewEmail() {
  return (
    process.env.REVIEW_NOTIFICATION_EMAIL ||
    process.env.SES_FROM_EMAIL ||
    SUPPORT_EMAIL
  );
}

export async function sendEmail({
  to,
  subject,
  html,
  text
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const region = process.env.AWS_REGION || "us-east-2";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS SES credentials are not configured.");
    }

    const client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });

    const response = await client.send(
      new SendEmailCommand({
        Source: `${FROM_NAME} <${fromEmail()}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Charset: "UTF-8", Data: subject },
          Body: {
            Html: { Charset: "UTF-8", Data: html },
            Text: { Charset: "UTF-8", Data: text }
          }
        }
      })
    );

    return { success: true, messageId: response.MessageId };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email"
    };
  }
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** Light-only, single-column, semantic HTML shell. One <h1> per email. */
function baseEmailTemplate({
  title,
  body,
  preheader
}: {
  title: string;
  body: string;
  preheader: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f7; color: ${COLOR.body};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .content { background: #ffffff; border-radius: 12px; padding: 32px; }
    .brand { color: ${COLOR.cta}; font-weight: 700; font-size: 20px; letter-spacing: -0.01em; margin-bottom: 20px; }
    h1 { font-size: 24px; line-height: 1.3; margin: 0 0 16px; color: ${COLOR.body}; }
    h2 { font-size: 18px; line-height: 1.3; margin: 24px 0 12px; color: ${COLOR.body}; }
    p { margin: 0 0 16px; color: ${COLOR.body}; }
    a { color: ${COLOR.link}; }
    .btn { display: inline-block; background: ${COLOR.cta}; color: #ffffff; text-decoration: none;
      font-weight: 600; padding: 12px 24px; border-radius: 8px; }
    .panel { background: ${COLOR.panel}; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
    .panel p { margin: 0 0 8px; }
    .panel p:last-child { margin: 0; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid ${COLOR.border};
      color: ${COLOR.muted}; font-size: 13px; }
    .footer a { color: ${COLOR.muted}; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <div class="container">
    <div class="content">
      <div class="brand">iAccessibility</div>
      <h1>${escapeHtml(title)}</h1>
      ${body}
      <p class="footer">
        You are receiving this email from iAccessibility.
        <a href="${absoluteUrl()}">Visit iAccessibility</a> &middot;
        <a href="mailto:${SUPPORT_EMAIL}">Email iAccessibility support</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function button(href: string, label: string) {
  return `<p><a class="btn" href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`;
}

function paragraph(text: string) {
  return `<p>${escapeHtml(text)}</p>`;
}

function detailPanel(rows: Array<[string, string | null | undefined]>) {
  const items = rows
    .map(
      ([label, value]) =>
        `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(
          value && value.length ? value : "Not provided"
        )}</p>`
    )
    .join("");
  return `<div class="panel">${items}</div>`;
}

function rowsToText(rows: Array<[string, string | null | undefined]>) {
  return rows
    .map(([label, value]) => `${label}: ${value && value.length ? value : "Not provided"}`)
    .join("\n");
}

const SUBMISSION_LABEL: Record<string, string> = {
  directory: "app listing",
  report: "Report article",
  audio: "iACast audio submission"
};

// ---------------------------------------------------------------------------
// Templates — one per platform event
// ---------------------------------------------------------------------------

export function welcomeEmail(params: { name?: string | null }): EmailContent {
  const name = params.name?.trim() || "there";
  const body =
    paragraph(`Hi ${name},`) +
    paragraph(
      "Thanks for joining iAccessibility — your community for accessible technology reporting, podcasts, app discovery, and conversation. Making Success Accessible is our mission and our passion."
    ) +
    "<h2>What you can do here</h2>" +
    `<div class="panel">
      <p><strong>Read the Report</strong> for in-depth accessibility reviews of apps and devices.</p>
      <p><strong>Listen to the iACast Network</strong> of accessibility-focused podcasts.</p>
      <p><strong>Explore the App Directory</strong> and submit apps you have tested.</p>
    </div>` +
    button(absoluteUrl(), "Explore iAccessibility");
  const text = `Hi ${name},

Thanks for joining iAccessibility, your community for accessible technology reporting, podcasts, app discovery, and conversation. Making Success Accessible is our mission and our passion.

What you can do here:
- Read the Report for in-depth accessibility reviews of apps and devices.
- Listen to the iACast Network of accessibility-focused podcasts.
- Explore the App Directory and submit apps you have tested.

Explore iAccessibility: ${absoluteUrl()}

You are receiving this email from iAccessibility. Questions? ${SUPPORT_EMAIL}`;
  return {
    subject: "Welcome to iAccessibility",
    html: baseEmailTemplate({
      title: "Welcome to iAccessibility",
      preheader: "Your iAccessibility account is ready.",
      body
    }),
    text
  };
}

export function adminNewUserEmail(params: {
  email: string;
  name?: string | null;
}): EmailContent {
  const rows: Array<[string, string | null | undefined]> = [
    ["Name", params.name],
    ["Email", params.email]
  ];
  const body =
    paragraph("A new member just created an iAccessibility account.") +
    detailPanel(rows) +
    button(absoluteUrl("/admin"), "Open the admin review queue");
  return {
    subject: `New iAccessibility member: ${params.name || params.email}`,
    html: baseEmailTemplate({
      title: "New member signup",
      preheader: "A new member joined iAccessibility.",
      body
    }),
    text: `A new member just created an iAccessibility account.\n\n${rowsToText(
      rows
    )}\n\nAdmin review queue: ${absoluteUrl("/admin")}`
  };
}

/** Confirmation to the person who submitted something. */
export function submissionReceivedEmail(params: {
  kind: "directory" | "report" | "audio";
  name?: string | null;
  itemTitle: string;
}): EmailContent {
  const name = params.name?.trim() || "there";
  const label = SUBMISSION_LABEL[params.kind];
  const body =
    paragraph(`Hi ${name},`) +
    paragraph(
      `Thanks for your submission. Your ${label}, "${params.itemTitle}", has been received and is now pending review by the iAccessibility team.`
    ) +
    `<div class="panel"><p>We review every submission to make sure it is accurate and helpful. You will get another email once a decision has been made — usually within a few days.</p></div>`;
  return {
    subject: `We received your ${label}: ${params.itemTitle}`,
    html: baseEmailTemplate({
      title: "Submission received",
      preheader: `Your ${label} is pending review.`,
      body
    }),
    text: `Hi ${name},

Thanks for your submission. Your ${label}, "${params.itemTitle}", has been received and is now pending review by the iAccessibility team.

We review every submission to make sure it is accurate and helpful. You will get another email once a decision has been made, usually within a few days.

Visit iAccessibility: ${absoluteUrl()}`
  };
}

/** Notify the review team that something new is pending. */
export function adminSubmissionEmail(params: {
  kind: "directory" | "report" | "audio";
  itemTitle: string;
  rows: Array<[string, string | null | undefined]>;
}): EmailContent {
  const label = SUBMISSION_LABEL[params.kind];
  const body =
    paragraph(`A new ${label} is pending review.`) +
    detailPanel(params.rows) +
    button(absoluteUrl("/admin"), "Review in the admin queue");
  return {
    subject: `New ${label} pending: ${params.itemTitle}`,
    html: baseEmailTemplate({
      title: `New ${label} submitted`,
      preheader: `A new ${label} is pending review.`,
      body
    }),
    text: `A new ${label} is pending review.\n\n${rowsToText(
      params.rows
    )}\n\nReview in the admin queue: ${absoluteUrl("/admin")}`
  };
}

/** Decision (approved/rejected) sent to the submitter. */
export function submissionDecisionEmail(params: {
  kind: "directory" | "report" | "audio";
  decision: "approved" | "rejected";
  name?: string | null;
  itemTitle: string;
  reason?: string | null;
  liveUrl?: string | null;
}): EmailContent {
  const name = params.name?.trim() || "there";
  const label = SUBMISSION_LABEL[params.kind];

  if (params.decision === "approved") {
    const body =
      paragraph(`Hi ${name},`) +
      paragraph(
        `Good news — your ${label}, "${params.itemTitle}", has been approved and is now live on iAccessibility.`
      ) +
      (params.liveUrl
        ? button(params.liveUrl, `View your ${label}`)
        : button(absoluteUrl(), "Visit iAccessibility"));
    return {
      subject: `Approved: ${params.itemTitle} is now live`,
      html: baseEmailTemplate({
        title: "Your submission is live",
        preheader: `Your ${label} has been approved.`,
        body
      }),
      text: `Hi ${name},

Good news, your ${label} "${params.itemTitle}" has been approved and is now live on iAccessibility.

${params.liveUrl ? `View it: ${params.liveUrl}` : `Visit iAccessibility: ${absoluteUrl()}`}`
    };
  }

  const reasonBlock = params.reason
    ? `<div class="panel"><p><strong>Reason:</strong> ${escapeHtml(params.reason)}</p></div>`
    : "";
  const body =
    paragraph(`Hi ${name},`) +
    paragraph(
      `We reviewed your ${label}, "${params.itemTitle}", and were not able to publish it this time.`
    ) +
    reasonBlock +
    paragraph(
      "You are welcome to make changes and submit again. If you have questions, just reply to this email."
    ) +
    button(absoluteUrl(), "Edit and resubmit");
  return {
    subject: `Update on your ${label}: ${params.itemTitle}`,
    html: baseEmailTemplate({
      title: "Submission not approved",
      preheader: `An update on your ${label}.`,
      body
    }),
    text: `Hi ${name},

We reviewed your ${label} "${params.itemTitle}" and were not able to publish it this time.
${params.reason ? `\nReason: ${params.reason}\n` : ""}
You are welcome to make changes and submit again. If you have questions, just reply to this email.

Visit iAccessibility: ${absoluteUrl()}`
  };
}

// ---------------------------------------------------------------------------
// Senders (fire-and-forget friendly; never throw to the caller)
// ---------------------------------------------------------------------------

async function deliver(to: string | null | undefined, content: EmailContent) {
  if (!to) return;
  try {
    await sendEmail({ to, ...content });
  } catch (error) {
    console.error("Email delivery failed:", error);
  }
}

export function sendWelcomeEmail(to: string, name?: string | null) {
  return deliver(to, welcomeEmail({ name }));
}

export function notifyAdminNewUser(params: { email: string; name?: string | null }) {
  return deliver(reviewEmail(), adminNewUserEmail(params));
}

export function sendSubmissionReceived(
  to: string,
  params: { kind: "directory" | "report" | "audio"; name?: string | null; itemTitle: string }
) {
  return deliver(to, submissionReceivedEmail(params));
}

export function notifyAdminSubmission(params: {
  kind: "directory" | "report" | "audio";
  itemTitle: string;
  rows: Array<[string, string | null | undefined]>;
}) {
  return deliver(reviewEmail(), adminSubmissionEmail(params));
}

export function sendSubmissionDecision(
  to: string,
  params: {
    kind: "directory" | "report" | "audio";
    decision: "approved" | "rejected";
    name?: string | null;
    itemTitle: string;
    reason?: string | null;
    liveUrl?: string | null;
  }
) {
  return deliver(to, submissionDecisionEmail(params));
}
