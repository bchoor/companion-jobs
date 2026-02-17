import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { readFile, unlink } from 'fs/promises';
import sharp from 'sharp';
import { config } from 'dotenv';
import { d1Execute } from './d1-client';

// Load environment variables
config();

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Upload a file to R2, converting to WebP and hashing the content
 * @param filePath Path to the file to upload (will be deleted after upload)
 * @returns SHA-256 hash of the WebP content
 */
export async function r2Put(filePath: string): Promise<string> {
  // Read original file
  const buffer = await readFile(filePath);

  // Convert to WebP
  const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

  // Hash the WebP content (not the original)
  const hash = createHash('sha256').update(webpBuffer).digest('hex');
  const key = `${hash.slice(0, 2)}/${hash}.webp`;

  // Upload to R2
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: webpBuffer,
    ContentType: 'image/webp',
  }));

  // Delete temp file
  await unlink(filePath);

  // Record in D1 files table
  await d1Execute(
    'INSERT OR IGNORE INTO files (hash, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?)',
    [hash, filePath, 'image/webp', webpBuffer.length]
  );

  return hash;
}
