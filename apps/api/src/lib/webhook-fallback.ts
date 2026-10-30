import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const FAILED_SUBDIR = 'failed';

async function ensureDir(): Promise<void> {
  await fs.mkdir(env.TMP_WEBHOOKS_DIR, { recursive: true });
}

export interface FallbackFile { path: string; fileName: string; }

export async function writeFallback(
  rawBody: Buffer,
  meta: Record<string, unknown>,
): Promise<FallbackFile> {
  await ensureDir();
  const fileName = `${randomUUID()}.json`;
  const path = join(env.TMP_WEBHOOKS_DIR, fileName);
  const body = { receivedAt: new Date().toISOString(), meta, rawBody: rawBody.toString('base64') };
  await fs.writeFile(path, JSON.stringify(body), 'utf8');
  return { path, fileName };
}

export async function listFallbackFiles(): Promise<FallbackFile[]> {
  await ensureDir();
  const files = await fs.readdir(env.TMP_WEBHOOKS_DIR).catch(() => [] as string[]);
  return files.filter((f) => f.endsWith('.json')).map((f) => ({ fileName: f, path: join(env.TMP_WEBHOOKS_DIR, f) }));
}

export async function readFallback(path: string): Promise<{ rawBody: Buffer; meta: Record<string, unknown> }> {
  const txt = await fs.readFile(path, 'utf8');
  const parsed = JSON.parse(txt) as { rawBody: string; meta: Record<string, unknown> };
  return { rawBody: Buffer.from(parsed.rawBody, 'base64'), meta: parsed.meta };
}

export async function deleteFallback(path: string): Promise<void> {
  await fs.unlink(path).catch(() => {});
}

export async function moveToFailed(path: string): Promise<string> {
  await ensureDir();
  const failedDir = join(env.TMP_WEBHOOKS_DIR, FAILED_SUBDIR);
  await fs.mkdir(failedDir, { recursive: true });
  const dest = join(failedDir, path.split(/[\\/]/).pop()!);
  await fs.rename(path, dest);
  return dest;
}