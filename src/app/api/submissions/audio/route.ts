import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAppUser } from "@/lib/auth/server";
import { notifyAdminSubmission, sendSubmissionReceived } from "@/lib/email/client";
import { uploadSubmissionFile } from "@/lib/storage/spaces";

const schema = z.object({
  title: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  description: z.string().min(1)
});

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to submit audio content." },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    title: value(formData, "title"),
    firstName: value(formData, "firstName"),
    lastName: value(formData, "lastName"),
    description: value(formData, "description")
  });

  const media = formData.get("media");

  if (!parsed.success || !(media instanceof File) || media.size === 0) {
    return NextResponse.json(
      { error: "Please complete the audio submission and attach a media file." },
      { status: 400 }
    );
  }

  const allowed = [
    "audio/wav",
    "audio/mpeg",
    "audio/mp4",
    "audio/flac",
    "audio/x-m4a"
  ];

  if (media.type && !allowed.includes(media.type)) {
    return NextResponse.json(
      { error: "Use a WAV, MP3, M4A, or FLAC audio file." },
      { status: 400 }
    );
  }

  const upload = await uploadSubmissionFile(media, "audio");
  const data = parsed.data;

  await notifyAdminSubmission({
    kind: "audio",
    itemTitle: data.title,
    rows: [
      ["Episode title", data.title],
      ["Submitter", `${data.firstName} ${data.lastName}`],
      ["Signed-in email", user.email],
      ["Description", data.description],
      ["Media file", upload.url]
    ]
  });
  void sendSubmissionReceived(user.email, {
    kind: "audio",
    name: `${data.firstName} ${data.lastName}`,
    itemTitle: data.title
  });

  return NextResponse.json({ uploaded: true, url: upload.url });
}
