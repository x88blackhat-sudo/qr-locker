import type { SubscriptionInfo, SubscriptionStatus } from '../../../shared/types';
import { config, TRIAL_DURATION_MS } from '../config';
import { db, withTransaction } from '../db';
import { HttpError } from '../lib/http';
import { DAY_MS } from '../lib/time';

interface SubscriptionRow {
  user_id: string;
  trial_started_at: number | null;
  trial_ends_at: number | null;
  trial_used: number;
  subscription_status: SubscriptionStatus;
  subscription_provider: string | null;
  subscription_reference: string | null;
  current_period_end: number | null;
  updated_at: number;
}

export function getSubscriptionRow(userId: string): SubscriptionRow | undefined {
  return db
    .prepare(
      `SELECT user_id, trial_started_at, trial_ends_at, trial_used, subscription_status,
              subscription_provider, subscription_reference, current_period_end, updated_at
       FROM subscriptions WHERE user_id = ?`,
    )
    .get(userId) as SubscriptionRow | undefined;
}

function deriveInfo(row: SubscriptionRow, now: number): SubscriptionInfo {
  let status = row.subscription_status;
  // The database is the source of truth; timestamps are never taken from a client.
  if (status === 'trialing' && row.trial_ends_at !== null && row.trial_ends_at <= now) {
    status = 'expired';
  }

  const daysRemaining =
    row.trial_ends_at !== null ? Math.max(0, Math.ceil((row.trial_ends_at - now) / DAY_MS)) : null;
  const hoursRemaining =
    row.trial_ends_at !== null ? Math.max(0, Math.ceil((row.trial_ends_at - now) / (60 * 60 * 1000))) : null;

  let access: SubscriptionInfo['access'] = 'none';
  if (status === 'active_paid') access = 'paid';
  else if (status === 'trialing') access = 'trial';
  else if (status === 'expired' || status === 'cancelled') access = 'expired';

  return {
    status,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    trialUsed: row.trial_used === 1,
    daysRemaining,
    hoursRemaining,
    subscriptionProvider: row.subscription_provider,
    currentPeriodEnd: row.current_period_end,
    access,
    paymentsConfigured: config.paymentsConfigured,
    endingSoon: access === 'trial' && (hoursRemaining ?? 0) <= 5 * 24,
  };
}

export function getSubscriptionInfo(userId: string, now: number = Date.now()): SubscriptionInfo {
  const row = getSubscriptionRow(userId);
  if (!row) {
    throw new HttpError(500, 'SUBSCRIPTION_MISSING', 'تعذّر العثور على بيانات الاشتراك.');
  }
  return deriveInfo(row, now);
}

/** Persists the lazy expiry transition so database state matches derived state. */
export function syncExpiredSubscription(userId: string): void {
  const now = Date.now();
  const row = getSubscriptionRow(userId);
  if (!row || row.subscription_status !== 'trialing' || !row.trial_ends_at) return;
  if (row.trial_ends_at > now) return;
  const changed = db
    .prepare(
      `UPDATE subscriptions SET subscription_status = 'expired', updated_at = ?
       WHERE user_id = ? AND subscription_status = 'trialing' AND trial_ends_at <= ?`,
    )
    .run(now, userId, now);
  if (changed.changes > 0) {
    db.prepare(
      `INSERT INTO trial_events (user_id, event, at, meta) VALUES (?, 'expired', ?, ?)`,
    ).run(userId, now, JSON.stringify({ reason: 'trial_ended' }));
  }
}

/** Bulk expiry, called periodically and safe to run concurrently. */
export function expireDueTrials(now: number = Date.now()): number {
  const rows = db
    .prepare(
      `SELECT user_id FROM subscriptions
       WHERE subscription_status = 'trialing' AND trial_ends_at IS NOT NULL AND trial_ends_at <= ?`,
    )
    .all(now) as { user_id: string }[];
  if (rows.length === 0) return 0;
  return withTransaction(() => {
    let expired = 0;
    for (const { user_id } of rows) {
      const changed = db
        .prepare(
          `UPDATE subscriptions SET subscription_status = 'expired', updated_at = ?
           WHERE user_id = ? AND subscription_status = 'trialing'`,
        )
        .run(now, user_id);
      if (changed.changes > 0) {
        expired += 1;
        db.prepare(`INSERT INTO trial_events (user_id, event, at) VALUES (?, 'expired', ?)`).run(
          user_id,
          now,
        );
      }
    }
    return expired;
  });
}

export interface StartTrialMeta {
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Starts the single 30-day trial. One atomic UPDATE guarantees that concurrent
 * requests (or repeated clicks from several devices) cannot create a second trial.
 */
export function startTrial(userId: string, meta: StartTrialMeta = {}): SubscriptionInfo {
  const now = Date.now();
  syncExpiredSubscription(userId);
  const existing = getSubscriptionRow(userId);
  if (!existing) throw new HttpError(500, 'SUBSCRIPTION_MISSING', 'تعذّر العثور على بيانات الاشتراك.');
  if (existing.trial_used === 1 || existing.subscription_status !== 'not_started') {
    throw new HttpError(
      409,
      'TRIAL_ALREADY_USED',
      'تمّ استعمال التجربة المجانية لهذا الحساب من قبل. كل حساب يستفيد من تجربة واحدة فقط.',
    );
  }

  const endsAt = now + TRIAL_DURATION_MS;
  const started = withTransaction(() => {
    const changed = db
      .prepare(
        `UPDATE subscriptions
         SET trial_started_at = ?, trial_ends_at = ?, trial_used = 1,
             subscription_status = 'trialing', updated_at = ?
         WHERE user_id = ? AND trial_used = 0 AND subscription_status = 'not_started'`,
      )
      .run(now, endsAt, now, userId);
    if (Number(changed.changes) === 0) return false;
    db.prepare(
      `INSERT INTO trial_events (user_id, event, at, ip, meta) VALUES (?, 'started', ?, ?, ?)`,
    ).run(
      userId,
      now,
      meta.ip ?? null,
      JSON.stringify({ userAgent: meta.userAgent?.slice(0, 200) ?? null, days: 30 }),
    );
    return true;
  });

  if (!started) {
    throw new HttpError(
      409,
      'TRIAL_ALREADY_USED',
      'تمّ استعمال التجربة المجانية لهذا الحساب من قبل. كل حساب يستفيد من تجربة واحدة فقط.',
    );
  }

  return getSubscriptionInfo(userId, now);
}

/**
 * The ONLY entry point that may grant `active_paid`.
 * It is intentionally not wired to an HTTP route: a verified provider webhook
 * must call it server-side with a reference that was checked against the provider.
 * See README → "Adding real payments".
 */
export function applyVerifiedPayment(input: {
  userId: string;
  provider: string;
  reference: string;
  currentPeriodEnd: number | null;
}): SubscriptionInfo {
  if (!config.paymentsConfigured) {
    throw new HttpError(
      409,
      'PAYMENTS_NOT_CONFIGURED',
      'معالجة الدفع غير مُفعّلة على هذا الخادم، لذلك لا يمكن تفعيل اشتراك مدفوع.',
    );
  }
  if (!input.provider || !input.reference) {
    throw new HttpError(400, 'PAYMENT_REFERENCE_REQUIRED', 'مرجع الدفع مطلوب.');
  }
  const now = Date.now();
  db.prepare(
    `UPDATE subscriptions
     SET subscription_status = 'active_paid', subscription_provider = ?, subscription_reference = ?,
         current_period_end = ?, updated_at = ?
     WHERE user_id = ?`,
  ).run(input.provider, input.reference, input.currentPeriodEnd, now, input.userId);
  db.prepare(
    `INSERT INTO trial_events (user_id, event, at, meta) VALUES (?, 'paid', ?, ?)`,
  ).run(input.userId, now, JSON.stringify({ provider: input.provider }));
  return getSubscriptionInfo(input.userId, now);
}
