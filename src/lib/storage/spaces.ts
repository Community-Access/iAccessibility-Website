import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

function getSpacesClient() {
  const endpoint = process.env.DO_SPACES_ENDPOINT;
  const region = process.env.DO_SPACES_REGION || "nyc3";
  const accessKeyId = process.env.DO_SPACES_KEY;
  const secretAccessKey = process.env.DO_SPACES_SECRET;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("DigitalOcean Spaces credentials are not configured.");
  }

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

export async function uploadSubmissionFile(file: File, folder: string) {
  const bucket = process.env.DO_SPACES_BUCKET;
  const basePrefix = process.env.DO_SPACES_PREFIX || "iAccessibility/podcast";

  if (!bucket) throw new Error("DO_SPACES_BUCKET is not configured.");

  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  const key = `${basePrefix}/submissions/${folder}/${randomUUID()}${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  await getSpacesClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
      ACL: "public-read"
    })
  );

  const cdn = process.env.DO_SPACES_CDN_URL || process.env.DO_SPACES_PUBLIC_URL;
  const fallback = `https://${bucket}.${process.env.DO_SPACES_REGION || "nyc3"}.digitaloceanspaces.com`;

  return {
    key,
    url: `${(cdn || fallback).replace(/\/$/, "")}/${key}`,
    bytes: file.size,
    mime: file.type || "application/octet-stream"
  };
}

export async function deleteSpacesObject(key: string) {
  const bucket = process.env.DO_SPACES_BUCKET;
  if (!bucket) throw new Error("DO_SPACES_BUCKET is not configured.");
  await getSpacesClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );
}
