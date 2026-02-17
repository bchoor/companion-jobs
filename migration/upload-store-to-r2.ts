#!/usr/bin/env bun
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readdirSync, readFileSync, statSync } from "fs";
import { resolve, join } from "path";
import sharp from "sharp";

// Load environment variables
const env = {
  R2_ENDPOINT: process.env.R2_ENDPOINT!,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME!,
};

if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
  console.error("❌ Missing required environment variables. Check .env file.");
  process.exit(1);
}

// Initialize S3 client for R2
const s3Client = new S3Client({
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  region: "auto",
});

const storeDir = resolve(import.meta.dir, "..", "store");

interface UploadStats {
  totalFiles: number;
  uploadedFiles: number;
  failedFiles: number;
  originalSizeBytes: number;
  webpSizeBytes: number;
  errors: Array<{ file: string; error: string }>;
}

const stats: UploadStats = {
  totalFiles: 0,
  uploadedFiles: 0,
  failedFiles: 0,
  originalSizeBytes: 0,
  webpSizeBytes: 0,
  errors: [],
};

async function uploadFile(filePath: string, key: string): Promise<void> {
  try {
    // Read original PNG file
    const originalBuffer = readFileSync(filePath);
    stats.originalSizeBytes += originalBuffer.length;

    // Convert to WebP
    const webpBuffer = await sharp(originalBuffer)
      .webp({ quality: 80 })
      .toBuffer();

    stats.webpSizeBytes += webpBuffer.length;

    // Upload to R2 with .webp extension
    const webpKey = key.replace(".png", ".webp");
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: webpKey,
        Body: webpBuffer,
        ContentType: "image/webp",
      })
    );

    stats.uploadedFiles++;
  } catch (error) {
    stats.failedFiles++;
    stats.errors.push({
      file: key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function scanAndUpload(dir: string): Promise<void> {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      await scanAndUpload(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".png")) {
      stats.totalFiles++;

      // Extract the key from the path (relative to store/)
      const relativePath = fullPath.replace(storeDir + "/", "");
      const key = relativePath;

      // Log progress every 10 files
      if (stats.totalFiles % 10 === 0) {
        console.log(`📦 Processed ${stats.totalFiles} files...`);
      }

      await uploadFile(fullPath, key);
    }
  }
}

console.log("🚀 Starting upload to R2...");
console.log(`📂 Store directory: ${storeDir}\n`);

await scanAndUpload(storeDir);

console.log("\n✅ Upload complete!");
console.log("\n📊 Summary:");
console.log(`   Total files: ${stats.totalFiles}`);
console.log(`   Uploaded: ${stats.uploadedFiles}`);
console.log(`   Failed: ${stats.failedFiles}`);
console.log(`   Original size: ${(stats.originalSizeBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`   WebP size: ${(stats.webpSizeBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Compression ratio: ${((1 - stats.webpSizeBytes / stats.originalSizeBytes) * 100).toFixed(1)}%`);

if (stats.errors.length > 0) {
  console.log("\n⚠️  Errors:");
  for (const error of stats.errors) {
    console.log(`   - ${error.file}: ${error.error}`);
  }
}
