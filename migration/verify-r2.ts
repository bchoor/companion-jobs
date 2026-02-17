#!/usr/bin/env bun
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const env = {
  R2_ENDPOINT: process.env.R2_ENDPOINT!,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME!,
};

const s3Client = new S3Client({
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  region: "auto",
});

console.log("📦 Listing objects in R2 bucket...\n");

const response = await s3Client.send(
  new ListObjectsV2Command({
    Bucket: env.R2_BUCKET_NAME,
    MaxKeys: 100,
  })
);

if (!response.Contents || response.Contents.length === 0) {
  console.log("⚠️  No objects found in bucket");
} else {
  console.log(`✅ Found ${response.Contents.length} objects:\n`);
  for (const obj of response.Contents) {
    const sizeKB = ((obj.Size || 0) / 1024).toFixed(2);
    console.log(`   ${obj.Key} (${sizeKB} KB)`);
  }
}
