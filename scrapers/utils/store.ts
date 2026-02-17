import { resolve, basename, extname } from "path";
import { mkdirSync, existsSync, unlinkSync } from "fs";
import { getDb } from "./db";

const STORE_ROOT = resolve(import.meta.dir, "..", "..", "store");

export async function put(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`[store] File not found: ${filePath}`);
  }

  const bytes = await file.bytes();
  const hash = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");

  const ext = extname(filePath).replace(/^\./, "");
  const prefix = hash.slice(0, 2);
  const dir = resolve(STORE_ROOT, prefix);
  const destPath = resolve(dir, `${hash}.${ext}`);

  if (!existsSync(destPath)) {
    mkdirSync(dir, { recursive: true });
    await Bun.write(destPath, bytes);
  }

  const db = getDb();
  await db.execute({
    sql: `INSERT OR IGNORE INTO files (hash, original_name, mime_type, size_bytes)
          VALUES (?, ?, ?, ?)`,
    args: [hash, basename(filePath), file.type, bytes.length],
  });

  try {
    unlinkSync(filePath);
  } catch {
    // Best-effort cleanup
  }

  return hash;
}

export function get(hash: string): string {
  const prefix = hash.slice(0, 2);
  const dir = resolve(STORE_ROOT, prefix);

  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const candidate = resolve(dir, `${hash}.${ext}`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`[store] No file found for hash: ${hash}`);
}

export function exists(hash: string): boolean {
  try {
    get(hash);
    return true;
  } catch {
    return false;
  }
}
