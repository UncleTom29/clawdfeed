import { Queue, Worker, Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import crypto from 'crypto';
import { prisma } from '../database.js';
import { redis } from '../redis.js';
import { config } from '../config.js';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface WeeklyPayoutPayload {
  type: 'weekly-payout';
}

interface SinglePayoutPayload {
  type: 'single-payout';
  agentId: string;
}

type PayoutJobPayload = WeeklyPayoutPayload | SinglePayoutPayload;

interface PayoutResult {
  agentId: string;
  amountCents: number;
  transactionHash: string;
  revenueCount: number;
}

interface PayoutFailure {
  agentId: string;
  reason: string;
}

interface PayoutSummary {
  processedCount: number;
  totalAmountCents: number;
  failures: PayoutFailure[];
}

// ------------------------------------------------------------------
// Redis connection for BullMQ
// ------------------------------------------------------------------

const bullConnection: ConnectionOptions = {
  host: new URL(config.REDIS_URL).hostname,
  port: Number(new URL(config.REDIS_URL).port) || 6379,
  password: new URL(config.REDIS_URL).password || undefined,
  username: new URL(config.REDIS_URL).username || undefined,
  maxRetriesPerRequest: null,
};

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const QUEUE_NAME = 'payout-processing';
const MINIMUM_PAYOUT_CENTS = 1000; // $10.00

// ------------------------------------------------------------------
// Queue
// ------------------------------------------------------------------

export const payoutQueue = new Queue<PayoutJobPayload>(QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
});

// ------------------------------------------------------------------
// Payout processing logic
// ------------------------------------------------------------------

async function processAgentPayout(agentId: string): Promise<PayoutResult | null> {
  // Use a Prisma transaction for financial data integrity
  return await prisma.$transaction(async (tx) => {
    // Find all unpaid revenue records for this agent
    const unpaidRevenues = await tx.revenue.findMany({
      where: {
        agentId,
        isPaidOut: false,
      },
      select: {
        id: true,
        amount: true,
      },
    });

    if (unpaidRevenues.length === 0) {
      return null;
    }

    // Calculate total unpaid amount
    const totalAmountCents = unpaidRevenues.reduce(
      (sum, rev) => sum + rev.amount,
      0,
    );

    // Check minimum payout threshold
    if (totalAmountCents < MINIMUM_PAYOUT_CENTS) {
      console.info(
        `[payout-processor] Agent ${agentId}: unpaid amount ${totalAmountCents} cents is below minimum ${MINIMUM_PAYOUT_CENTS} cents — skipping`,
      );
      return null;
    }

    // Check that the agent has a claimed owner with a wallet address
    const agent = await tx.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        handle: true,
        isClaimed: true,
        owner: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.isClaimed || !agent.owner) {
      console.warn(
        `[payout-processor] Agent ${agentId} (@${agent.handle}) is not claimed — skipping payout`,
      );
      return null;
    }

    if (!agent.owner.walletAddress) {
      console.warn(
        `[payout-processor] Agent ${agentId} (@${agent.handle}) owner has no wallet address — skipping payout`,
      );
      return null;
    }

    // Generate mock transaction hash
    const transactionHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    const now = new Date();

    // Mark all unpaid revenues as paid
    const revenueIds = unpaidRevenues.map((r) => r.id);

    await tx.revenue.updateMany({
      where: {
        id: { in: revenueIds },
      },
      data: {
        isPaidOut: true,
        paidOutAt: now,
        transactionHash,
      },
    });

    // Update agent total earnings
    await tx.agent.update({
      where: { id: agentId },
      data: {
        totalEarnings: { increment: totalAmountCents },
      },
    });

    // Update owner total earnings
    await tx.humanOwner.update({
      where: { id: agent.owner.id },
      data: {
        totalEarnings: { increment: totalAmountCents },
      },
    });

    console.info(
      `[payout-processor] Processed payout for agent ${agentId} (@${agent.handle}): ` +
        `${totalAmountCents} cents (${unpaidRevenues.length} revenue records) — tx: ${transactionHash}`,
    );

    return {
      agentId,
      amountCents: totalAmountCents,
      transactionHash,
      revenueCount: unpaidRevenues.length,
    };
  });
}

async function processWeeklyPayout(): Promise<PayoutSummary> {
  console.info('[payout-processor] Starting weekly payout processing...');

  // Find all agents with unpaid revenue >= minimum threshold
  // Group revenue by agent and filter by minimum amount
  const eligibleAgents = await prisma.revenue.groupBy({
    by: ['agentId'],
    where: {
      isPaidOut: false,
    },
    _sum: {
      amount: true,
    },
    having: {
      amount: {
        _sum: {
          gte: MINIMUM_PAYOUT_CENTS,
        },
      },
    },
  });

  console.info(
    `[payout-processor] Found ${eligibleAgents.length} eligible agents for payout`,
  );

  const summary: PayoutSummary = {
    processedCount: 0,
    totalAmountCents: 0,
    failures: [],
  };

  // Process each eligible agent sequentially to avoid overwhelming the database
  for (const group of eligibleAgents) {
    try {
      const result = await processAgentPayout(group.agentId);

      if (result) {
        summary.processedCount += 1;
        summary.totalAmountCents += result.amountCents;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      console.error(
        `[payout-processor] Failed to process payout for agent ${group.agentId}:`,
        errorMessage,
      );

      summary.failures.push({
        agentId: group.agentId,
        reason: errorMessage,
      });
    }
  }

  console.info(
    `[payout-processor] Weekly payout complete: ` +
      `${summary.processedCount} processed, ` +
      `${summary.totalAmountCents} cents total, ` +
      `${summary.failures.length} failures`,
  );

  return summary;
}

async function processSinglePayout(agentId: string): Promise<PayoutResult | null> {
  console.info(
    `[payout-processor] Processing single payout for agent ${agentId}...`,
  );

  const result = await processAgentPayout(agentId);

  if (!result) {
    console.info(
      `[payout-processor] No payout processed for agent ${agentId} (below minimum, unclaimed, or no wallet)`,
    );
  }

  return result;
}

// ------------------------------------------------------------------
// Worker
// ------------------------------------------------------------------

export const payoutWorker = new Worker<PayoutJobPayload>(
  QUEUE_NAME,
  async (job: Job<PayoutJobPayload>) => {
    const { type } = job.data;

    console.info(
      `[payout-processor] Processing job ${job.id} of type "${type}"`,
    );

    switch (type) {
      case 'weekly-payout': {
        const summary = await processWeeklyPayout();
        return summary;
      }

      case 'single-payout': {
        const { agentId } = job.data as SinglePayoutPayload;
        const result = await processSinglePayout(agentId);
        return result;
      }

      default: {
        const exhaustive: never = type;
        throw new Error(`Unknown payout job type: ${String(exhaustive)}`);
      }
    }
  },
  {
    connection: bullConnection,
    concurrency: 1, // Process payouts sequentially for financial safety
    limiter: {
      max: 10,
      duration: 60_000,
    },
  },
);

// ------------------------------------------------------------------
// Worker event handlers
// ------------------------------------------------------------------

payoutWorker.on('completed', (job: Job<PayoutJobPayload> | undefined, result: unknown) => {
  console.info(
    `[payout-processor] Job ${job?.id} completed successfully`,
    result,
  );
});

payoutWorker.on('failed', (job: Job<PayoutJobPayload> | undefined, err: Error) => {
  console.error(
    `[payout-processor] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
    err.message,
  );
});

payoutWorker.on('error', (err: Error) => {
  console.error('[payout-processor] Worker error:', err.message);
});

// ------------------------------------------------------------------
// Enqueue helpers (called by API routes or other services)
// ------------------------------------------------------------------

export async function enqueueWeeklyPayout(): Promise<string | undefined> {
  const job = await payoutQueue.add(
    'weekly-payout',
    { type: 'weekly-payout' },
    {
      jobId: `weekly-payout:${Date.now()}`,
    },
  );
  return job.id;
}

export async function enqueueSinglePayout(agentId: string): Promise<string | undefined> {
  const job = await payoutQueue.add(
    'single-payout',
    { type: 'single-payout', agentId },
    {
      jobId: `single-payout:${agentId}:${Date.now()}`,
    },
  );
  return job.id;
}

// ------------------------------------------------------------------
// Schedule recurring jobs
// ------------------------------------------------------------------

async function scheduleRecurringJobs(): Promise<void> {
  // Remove any stale repeatable jobs before re-adding
  const existingRepeatables = await payoutQueue.getRepeatableJobs();
  for (const repeatable of existingRepeatables) {
    await payoutQueue.removeRepeatableByKey(repeatable.key);
  }

  // Schedule weekly payout: every Monday at 00:00 UTC
  await payoutQueue.add(
    'weekly-payout',
    { type: 'weekly-payout' },
    {
      repeat: {
        pattern: config.PAYOUT_CRON, // '0 0 * * 1'
      },
      jobId: 'recurring:weekly-payout',
    },
  );

  console.info(
    `[payout-processor] Recurring weekly payout scheduled with cron: ${config.PAYOUT_CRON}`,
  );
}

// ------------------------------------------------------------------
// Startup
// ------------------------------------------------------------------

export async function startPayoutProcessor(): Promise<void> {
  console.info('[payout-processor] Starting payout processing worker...');

  await scheduleRecurringJobs();

  console.info('[payout-processor] Payout processing worker started.');
}

// ------------------------------------------------------------------
// Graceful shutdown
// ------------------------------------------------------------------

export async function stopPayoutProcessor(): Promise<void> {
  console.info('[payout-processor] Shutting down payout processing worker...');

  const shutdownTimeout = 30_000; // Longer timeout for financial operations

  try {
    // Close worker first (stop processing new jobs, wait for in-progress to finish)
    await Promise.race([
      payoutWorker.close(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Worker close timed out')), shutdownTimeout),
      ),
    ]);

    // Then close the queue
    await Promise.race([
      payoutQueue.close(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Queue close timed out')), shutdownTimeout),
      ),
    ]);

    console.info('[payout-processor] Payout processing worker stopped gracefully.');
  } catch (err) {
    console.error('[payout-processor] Error during shutdown:', err);
    // Force-close on timeout
    try {
      await payoutWorker.close();
    } catch { /* already closing */ }
    try {
      await payoutQueue.close();
    } catch { /* already closing */ }
  }
}

// Handle process signals for standalone execution
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

for (const signal of signals) {
  process.on(signal, () => {
    console.info(`[payout-processor] Received ${signal}`);
    stopPayoutProcessor()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}
