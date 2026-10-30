// Real Cloudflare R2 adapter (Phase 12 task 4). Falls back to mock if env missing.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { createMockSignedUrl, type SignedUploadUrl } from './r2-mock.js';

const TTL_SECONDS = 900;
let client: S3Client | null = null;

function getClient(): S3Client | null {
  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET) return null;
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export function isR2Configured(): boolean {
  return getClient() !== null;
}

export async function createSignedUploadUrl(params: {
  userId: string;
  filename: string;
  contentType: string;
  purpose: string;
}): Promise<SignedUploadUrl> {
  const s3 = getClient();
  if (!s3 || !env.R2_BUCKET) {
    logger.debug({ purpose: params.purpose }, 'R2 not configured - using mock');
    return createMockSignedUrl(params);
  }
  const safe = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uploadId = `r2_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const key = `driver-kyc/${params.userId}/${uploadId}/${safe}`;
  const cmd = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: params.contentType,
  });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: TTL_SECONDS });
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
  return { uploadId, uploadUrl, expiresAt };
}