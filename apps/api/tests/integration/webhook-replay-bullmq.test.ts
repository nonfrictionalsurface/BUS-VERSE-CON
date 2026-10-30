import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../../src/config/env.js';
import { runReplayTick } from '../../src/workers/replay-webhooks.worker.js';
import { getWebhookReplayQueue, closeQueues } from '../../src/workers/queue.js';
import { JOB_REPLAY_WEBHOOK, QUEUE_WEBHOOK_REPLAY } from '../../src/workers/types.js';

async function ensureTmpDir(): Promise<void> {
  await fs.mkdir(env.TMP_WEBHOOKS_DIR, { recursive: true });
}

async function writeFakeWebhookFile(): Promise<{ path: string; fileName: string }> {
  await ensureTmpDir();
  const fileName = `test-${randomUUID()}.json`;
  const path = join(env.TMP_WEBHOOKS_DIR, fileName);
  const body = {
    receivedAt: new Date().toISOString(),
    meta: { event: 'payment.captured', signature: 'test-sig' },
    rawBody: Buffer.from('{"event":"payment.captured","payload":{}}').toString('base64'),
  };
  await fs.writeFile(path, JSON.stringify(body), 'utf8');
  return { path, fileName };
}

async function clearQueue(): Promise<void> {
  try { await getWebhookReplayQueue().drain(true); } catch { /* queue not up */ }
}

async function clearTmpDir(): Promise<void> {
  try {
    const files = await fs.readdir(env.TMP_WEBHOOKS_DIR);
    for (const f of files) {
      if (f.endsWith('.json')) await fs.unlink(join(env.TMP_WEBHOOKS_DIR, f)).catch(() => {});
    }
  } catch { /* dir may not exist */ }
}

beforeAll(async () => { await clearTmpDir(); await clearQueue(); });
afterAll(async () => { await clearTmpDir(); await closeQueues(); });
beforeEach(async () => { await clearTmpDir(); await clearQueue(); });

describe('replay-webhooks producer (BullMQ migration)', () => {
  it('runReplayTick enqueues a job for each file in TMP_WEBHOOKS_DIR', async () => {
    const { fileName } = await writeFakeWebhookFile();
    await runReplayTick();

    const queue = getWebhookReplayQueue();
    const jobs = await queue.getJobs(['waiting', 'active', 'delayed', 'completed'], 0, 10, true);
    const matching = jobs.filter((j) => j.name === JOB_REPLAY_WEBHOOK && j.id === fileName);
    expect(matching.length).toBeGreaterThanOrEqual(1);
    expect(matching[0]!.data).toMatchObject({ fileName });
    expect(QUEUE_WEBHOOK_REPLAY).toBe('webhook-replay');
  });

  it('idempotent: same file enqueued twice → single job (jobId = fileName)', async () => {
    const { fileName } = await writeFakeWebhookFile();
    await runReplayTick();
    await runReplayTick();

    const queue = getWebhookReplayQueue();
    const jobs = await queue.getJobs(['waiting', 'active', 'delayed', 'completed'], 0, 100, true);
    const matching = jobs.filter((j) => j.id === fileName);
    expect(matching.length).toBe(1);
  });
});