// Mock R2 adapter — Phase 6. Real Cloudflare R2 goes Phase 12.

export interface SignedUploadUrl {
  uploadId: string;
  uploadUrl: string;
  expiresAt: string;
}

const TTL_SECONDS = 900;

export function createMockSignedUrl(params: {
  userId: string;
  filename: string;
  contentType: string;
  purpose: string;
}): SignedUploadUrl {
  const uploadId = `mock_up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const safe = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uploadUrl = `https://mock-r2.local/upload/${params.userId}/${uploadId}/${safe}`;
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
  return { uploadId, uploadUrl, expiresAt };
}