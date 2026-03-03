// scripts/seed-approval-policies.ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import {
  BUSINESS_APPROVAL_POLICY_DEFAULTS,
  SYSTEM_APPROVAL_POLICY_DEFAULTS,
} from '../libs/database/src/lib/constants/approval-policy.constants';
import {
  ApprovalMode,
  ApprovalScope,
} from '../libs/database/src/lib/schemas/approval-policy.schema';

interface SeedOptions {
  dryRun: boolean;
  force: boolean;
  systemOnly: boolean;
  actorEmail: string;
}

interface SeedStats {
  inserted: number;
  updated: number;
  unchanged: number;
}

interface PolicyRecord {
  scope: ApprovalScope;
  actionKey: string;
  businessId: ObjectId | null;
  mode: ApprovalMode;
  businessApproverRoles: string[];
  systemApproverRoles: string[];
  isEnabled: boolean;
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

function parseOptions(argv: string[]): SeedOptions {
  const findValue = (prefix: string): string | null => {
    const matched = argv.find((arg) => arg.startsWith(`${prefix}=`));
    if (!matched) {
      return null;
    }
    return matched.slice(prefix.length + 1).trim();
  };

  const actorEmail = findValue('--actor-email') || 'seed.bot@triply.local';

  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
    systemOnly: argv.includes('--system-only'),
    actorEmail,
  };
}

function loadDotEnvIfPresent(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const value = line.slice(separatorIndex + 1).trim();
    process.env[key] = stripWrappingQuotes(value);
  }
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();

  return leftSorted.every((value, index) => value === rightSorted[index]);
}

function isEquivalentPolicy(
  existing: PolicyRecord,
  expected: PolicyRecord,
): boolean {
  return (
    existing.scope === expected.scope &&
    String(existing.businessId || '') === String(expected.businessId || '') &&
    existing.actionKey === expected.actionKey &&
    existing.mode === expected.mode &&
    arraysEqual(
      existing.businessApproverRoles || [],
      expected.businessApproverRoles,
    ) &&
    arraysEqual(
      existing.systemApproverRoles || [],
      expected.systemApproverRoles,
    ) &&
    existing.isEnabled === expected.isEnabled
  );
}

async function ensureSeedActor(actorEmail: string): Promise<ObjectId> {
  const users = mongoose.connection.collection('users');
  const now = new Date();

  const result = await users.findOneAndUpdate(
    { email: actorEmail },
    {
      $setOnInsert: {
        email: actorEmail,
        displayName: 'Triply Seed Bot',
        authProviders: ['otp'],
        avatarUrl: null,
        phone: null,
        isTraveller: false,
        isSystemUser: true,
        isActive: true,
        isEmailVerified: true,
        loginAttempts: 0,
        lockUntil: null,
        lastLoginAt: null,
        lastLoginIp: null,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      includeResultMetadata: false,
    },
  );

  if (!result || !result._id) {
    throw new Error('Failed to resolve seed actor user');
  }

  return result._id as ObjectId;
}

async function upsertPolicy(
  policy: PolicyRecord,
  options: SeedOptions,
): Promise<keyof SeedStats> {
  const approvalPolicies = mongoose.connection.collection('approvalpolicies');

  const filter = {
    scope: policy.scope,
    actionKey: policy.actionKey,
    businessId: policy.businessId,
  };

  const existing = (await approvalPolicies.findOne(
    filter,
  )) as PolicyRecord | null;

  if (!existing) {
    if (!options.dryRun) {
      await approvalPolicies.insertOne(policy);
    }
    return 'inserted';
  }

  if (!options.force || isEquivalentPolicy(existing, policy)) {
    return 'unchanged';
  }

  if (!options.dryRun) {
    await approvalPolicies.updateOne(
      filter,
      {
        $set: {
          mode: policy.mode,
          businessApproverRoles: policy.businessApproverRoles,
          systemApproverRoles: policy.systemApproverRoles,
          isEnabled: policy.isEnabled,
          updatedBy: policy.updatedBy,
          updatedAt: policy.updatedAt,
        },
      },
      { upsert: false },
    );
  }

  return 'updated';
}

function createSystemPolicy(
  actorId: ObjectId,
  actionKey: string,
  mode: ApprovalMode,
  systemApproverRoles: string[],
): PolicyRecord {
  const now = new Date();

  return {
    scope: ApprovalScope.SYSTEM,
    actionKey,
    businessId: null,
    mode,
    businessApproverRoles: [],
    systemApproverRoles: dedupe(systemApproverRoles),
    isEnabled: true,
    createdBy: actorId,
    updatedBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
}

function createBusinessPolicy(
  actorId: ObjectId,
  businessId: ObjectId,
  actionKey: string,
  mode: ApprovalMode,
  businessApproverRoles: string[],
): PolicyRecord {
  const now = new Date();

  return {
    scope: ApprovalScope.BUSINESS,
    actionKey,
    businessId,
    mode,
    businessApproverRoles: dedupe(businessApproverRoles),
    systemApproverRoles: [],
    isEnabled: true,
    createdBy: actorId,
    updatedBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
}

async function seedSystemPolicies(
  actorId: ObjectId,
  options: SeedOptions,
  stats: SeedStats,
): Promise<void> {
  for (const defaults of SYSTEM_APPROVAL_POLICY_DEFAULTS) {
    const outcome = await upsertPolicy(
      createSystemPolicy(
        actorId,
        defaults.actionKey,
        defaults.mode,
        defaults.systemApproverRoles,
      ),
      options,
    );
    stats[outcome] += 1;
  }
}

async function seedBusinessPolicies(
  actorId: ObjectId,
  options: SeedOptions,
  stats: SeedStats,
): Promise<void> {
  const businesses = mongoose.connection.collection('businesses');
  const businessDocs = await businesses
    .find({}, { projection: { _id: 1 } })
    .toArray();

  for (const business of businessDocs) {
    for (const defaults of BUSINESS_APPROVAL_POLICY_DEFAULTS) {
      const outcome = await upsertPolicy(
        createBusinessPolicy(
          actorId,
          business._id as ObjectId,
          defaults.actionKey,
          defaults.mode,
          defaults.businessApproverRoles,
        ),
        options,
      );
      stats[outcome] += 1;
    }
  }
}

async function main(): Promise<void> {
  loadDotEnvIfPresent();
  const options = parseOptions(process.argv.slice(2));
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(mongoUri);

  const actorId = await ensureSeedActor(options.actorEmail);
  const stats: SeedStats = { inserted: 0, updated: 0, unchanged: 0 };

  await seedSystemPolicies(actorId, options, stats);

  if (!options.systemOnly) {
    await seedBusinessPolicies(actorId, options, stats);
  }

  const mode = options.dryRun ? 'DRY RUN' : 'APPLIED';
  console.log(`[seed:approval-policies] ${mode}`);
  console.log(
    `[seed:approval-policies] inserted=${stats.inserted}, updated=${stats.updated}, unchanged=${stats.unchanged}`,
  );

  await mongoose.disconnect();
}

main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[seed:approval-policies] failed: ${message}`);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore close errors during failure path
  }
  process.exit(1);
});
