# Prisma Migration Model

**Status:** Architecture Specification v1.0
**Last Updated:** 2025-11-28

---

## Overview

Strix manages database schema migrations across multiple tenant instances using Prisma's migration system. This document defines the control-plane tracking model, rollout strategies, and operational procedures for safe schema evolution.

---

## Control Plane Schema

### Instance Schema Versions Table

The control plane maintains a tracking table to monitor schema versions across all instances:

```sql
CREATE TABLE instance_schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  vertical_id TEXT NOT NULL,
  current_version TEXT NOT NULL,
  target_version TEXT,
  migration_status TEXT NOT NULL DEFAULT 'current',
  last_migrated_at TIMESTAMPTZ,
  migration_started_at TIMESTAMPTZ,
  migration_completed_at TIMESTAMPTZ,
  migration_duration_ms INTEGER,
  migration_log TEXT,
  rollback_available BOOLEAN DEFAULT true,
  rollback_version TEXT,
  schema_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_migration_status CHECK (
    migration_status IN ('current', 'pending', 'in_progress', 'completed', 'failed', 'rolled_back')
  )
);

CREATE INDEX idx_schema_versions_instance ON instance_schema_versions(instance_id);
CREATE INDEX idx_schema_versions_vertical ON instance_schema_versions(vertical_id);
CREATE INDEX idx_schema_versions_status ON instance_schema_versions(migration_status);
CREATE INDEX idx_schema_versions_version ON instance_schema_versions(vertical_id, current_version);
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `instance_id` | UUID | Foreign key to instances table |
| `vertical_id` | TEXT | Vertical identifier (e.g., "replyhero") |
| `current_version` | TEXT | Current Prisma schema version (e.g., "20250115_add_reviews") |
| `target_version` | TEXT | Desired schema version (NULL if current) |
| `migration_status` | TEXT | Migration state: `current`, `pending`, `in_progress`, `completed`, `failed`, `rolled_back` |
| `last_migrated_at` | TIMESTAMPTZ | Timestamp of last successful migration |
| `migration_started_at` | TIMESTAMPTZ | When current migration began |
| `migration_completed_at` | TIMESTAMPTZ | When current migration completed |
| `migration_duration_ms` | INTEGER | Duration of last migration in milliseconds |
| `migration_log` | TEXT | Logs from migration execution (stdout/stderr) |
| `rollback_available` | BOOLEAN | Whether rollback is possible |
| `rollback_version` | TEXT | Version to rollback to if needed |
| `schema_hash` | TEXT | SHA-256 hash of current schema.prisma for verification |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Record last update timestamp |

---

## Migration Lifecycle

### State Diagram

```
┌─────────┐
│ current │ ◄───────────────────────────────────┐
└────┬────┘                                      │
     │                                           │
     │ New version available                     │
     ▼                                           │
┌─────────┐                                      │
│ pending │                                      │
└────┬────┘                                      │
     │                                           │
     │ Migration triggered                       │
     ▼                                           │
┌─────────────┐                                  │
│ in_progress │                                  │
└────┬────┬───┘                                  │
     │    │                                      │
     │    │ Migration failed ──┐                 │
     │    ▼                    │                 │
     │ ┌────────┐              │                 │
     │ │ failed │              │                 │
     │ └────┬───┘              │                 │
     │      │                  │                 │
     │      │ Rollback         │                 │
     │      ▼                  │                 │
     │ ┌──────────────┐        │                 │
     │ │ rolled_back  │────────┘                 │
     │ └──────────────┘                          │
     │                                           │
     │ Migration succeeded                       │
     ▼                                           │
┌───────────┐                                    │
│ completed │────────────────────────────────────┘
└───────────┘
```

### Status Definitions

| Status | Description |
|--------|-------------|
| `current` | Schema is up-to-date, no migration needed |
| `pending` | New version available, migration scheduled |
| `in_progress` | Migration actively running |
| `completed` | Migration succeeded, awaiting verification |
| `failed` | Migration failed, manual intervention required |
| `rolled_back` | Migration was rolled back to previous version |

---

## Migration Rollout Steps

### 1. Detect New Migration

**Trigger:** Vertical repository publishes new schema version

```typescript
// scripts/detect-new-migrations.ts
async function detectNewMigrations(verticalId: string) {
  const latestVersion = await getLatestSchemaVersion(verticalId);
  const instances = await registry.getInstancesByVertical(verticalId);

  for (const instance of instances) {
    const currentVersion = await getCurrentSchemaVersion(instance.instanceId);

    if (currentVersion !== latestVersion) {
      await db.query(`
        UPDATE instance_schema_versions
        SET target_version = $1,
            migration_status = 'pending',
            updated_at = NOW()
        WHERE instance_id = $2
      `, [latestVersion, instance.instanceId]);
    }
  }
}
```

### 2. Fetch Database URL

**Control Plane retrieves connection string:**

```typescript
async function getDatabaseUrl(instanceId: string): Promise<string> {
  const instance = await registry.getInstance(instanceId);

  // Option A: From Pulumi stack outputs
  const stack = new pulumi.Stack(instance.pulumiStackName);
  const outputs = await stack.outputs();
  return outputs.databaseUrl;

  // Option B: From instance registry (cached)
  return instance.databaseUrl;
}
```

### 3. Run Prisma Migration

**Execute migration against instance database:**

```typescript
// scripts/run-migration.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runMigration(instanceId: string, targetVersion: string) {
  // Mark migration as in_progress
  await db.query(`
    UPDATE instance_schema_versions
    SET migration_status = 'in_progress',
        migration_started_at = NOW(),
        updated_at = NOW()
    WHERE instance_id = $1
  `, [instanceId]);

  try {
    const databaseUrl = await getDatabaseUrl(instanceId);
    const instance = await registry.getInstance(instanceId);
    const verticalPath = `verticals/${instance.verticalId}/backend`;

    const startTime = Date.now();

    // Run Prisma migrate deploy
    const { stdout, stderr } = await execAsync(
      `cd ${verticalPath} && npx prisma migrate deploy`,
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl
        }
      }
    );

    const duration = Date.now() - startTime;

    // Update record with success
    await db.query(`
      UPDATE instance_schema_versions
      SET current_version = $1,
          target_version = NULL,
          migration_status = 'completed',
          last_migrated_at = NOW(),
          migration_completed_at = NOW(),
          migration_duration_ms = $2,
          migration_log = $3,
          rollback_version = $4,
          updated_at = NOW()
      WHERE instance_id = $5
    `, [targetVersion, duration, stdout + stderr, instance.currentVersion, instanceId]);

    console.log(`✅ Migration succeeded for instance ${instanceId}`);

  } catch (error) {
    // Update record with failure
    await db.query(`
      UPDATE instance_schema_versions
      SET migration_status = 'failed',
          migration_log = $1,
          updated_at = NOW()
      WHERE instance_id = $2
    `, [error.message + '\n' + error.stdout + '\n' + error.stderr, instanceId]);

    console.error(`❌ Migration failed for instance ${instanceId}: ${error.message}`);
    throw error;
  }
}
```

### 4. Update Record

**Post-migration verification:**

```typescript
async function verifyMigration(instanceId: string) {
  const instance = await registry.getInstance(instanceId);
  const healthUrl = `${instance.apiBaseUrl}/api/health`;

  try {
    const response = await fetch(healthUrl);
    const health = await response.json();

    if (health.database?.connected) {
      await db.query(`
        UPDATE instance_schema_versions
        SET migration_status = 'current',
            updated_at = NOW()
        WHERE instance_id = $1 AND migration_status = 'completed'
      `, [instanceId]);

      console.log(`✅ Migration verified for instance ${instanceId}`);
    } else {
      throw new Error('Database health check failed');
    }
  } catch (error) {
    await db.query(`
      UPDATE instance_schema_versions
      SET migration_status = 'failed',
          migration_log = migration_log || $1,
          updated_at = NOW()
      WHERE instance_id = $2
    `, [`\nVerification failed: ${error.message}`, instanceId]);

    console.error(`❌ Verification failed for instance ${instanceId}`);
  }
}
```

---

## Canary Strategy

### Canary Deployment Flow

```
1. Identify canary instance (staging or designated canary environment)
   ↓
2. Run migration on canary
   ↓
3. Monitor canary for N hours (default: 24h)
   ↓
4. If healthy, proceed with production rollout
   ↓
5. Roll out to production instances in batches
```

### Implementation

```typescript
async function canaryMigration(verticalId: string, targetVersion: string) {
  // Step 1: Find canary instance
  const canaryInstance = await registry.getInstances({
    verticalId,
    environment: 'canary'
  }).then(instances => instances[0]);

  if (!canaryInstance) {
    throw new Error('No canary instance found for vertical');
  }

  console.log(`🐤 Starting canary migration for instance ${canaryInstance.instanceId}`);

  // Step 2: Run migration on canary
  await runMigration(canaryInstance.instanceId, targetVersion);
  await verifyMigration(canaryInstance.instanceId);

  // Step 3: Monitor canary (24 hours)
  console.log('⏳ Monitoring canary for 24 hours...');
  await monitorCanary(canaryInstance.instanceId, 24 * 60 * 60 * 1000); // 24h in ms

  // Step 4: Check canary health
  const canaryHealthy = await isCanaryHealthy(canaryInstance.instanceId);

  if (!canaryHealthy) {
    console.error('❌ Canary unhealthy, aborting production rollout');
    await rollbackMigration(canaryInstance.instanceId);
    throw new Error('Canary migration failed health checks');
  }

  console.log('✅ Canary healthy, proceeding with production rollout');

  // Step 5: Roll out to production
  await rolloutToProduction(verticalId, targetVersion);
}

async function monitorCanary(instanceId: string, durationMs: number) {
  const endTime = Date.now() + durationMs;

  while (Date.now() < endTime) {
    const metrics = await getInstanceMetrics(instanceId);

    if (metrics.errorRate > 0.05) { // 5% error threshold
      throw new Error(`Canary error rate too high: ${metrics.errorRate}`);
    }

    await new Promise(resolve => setTimeout(resolve, 60000)); // Check every minute
  }
}

async function isCanaryHealthy(instanceId: string): Promise<boolean> {
  const metrics = await getInstanceMetrics(instanceId, { window: '24h' });

  return (
    metrics.errorRate < 0.02 &&    // < 2% errors
    metrics.avgLatency < 500 &&    // < 500ms avg latency
    metrics.uptime > 99.9          // > 99.9% uptime
  );
}
```

### Batch Rollout

```typescript
async function rolloutToProduction(verticalId: string, targetVersion: string) {
  const productionInstances = await registry.getInstances({
    verticalId,
    environment: 'prod',
    status: 'active'
  });

  // Sort by tenant priority (enterprise first)
  const sortedInstances = productionInstances.sort((a, b) =>
    getTenantPriority(b.tenantId) - getTenantPriority(a.tenantId)
  );

  // Define batch size (e.g., 10% of total)
  const batchSize = Math.ceil(sortedInstances.length * 0.1);

  for (let i = 0; i < sortedInstances.length; i += batchSize) {
    const batch = sortedInstances.slice(i, i + batchSize);

    console.log(`📦 Migrating batch ${i / batchSize + 1} (${batch.length} instances)`);

    // Run migrations in parallel within batch
    await Promise.all(
      batch.map(instance => runMigration(instance.instanceId, targetVersion))
    );

    // Verify batch
    await Promise.all(
      batch.map(instance => verifyMigration(instance.instanceId))
    );

    // Wait between batches (soak time)
    if (i + batchSize < sortedInstances.length) {
      console.log('⏳ Waiting 15 minutes before next batch...');
      await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000));
    }
  }

  console.log('✅ Production rollout complete');
}
```

---

## Rollback Strategy

### Automatic Rollback

```typescript
async function rollbackMigration(instanceId: string) {
  const schemaVersion = await db.query(`
    SELECT rollback_version, instance_id, vertical_id
    FROM instance_schema_versions
    WHERE instance_id = $1
  `, [instanceId]).then(r => r.rows[0]);

  if (!schemaVersion.rollback_version) {
    throw new Error('No rollback version available');
  }

  console.log(`🔄 Rolling back instance ${instanceId} to ${schemaVersion.rollback_version}`);

  try {
    const databaseUrl = await getDatabaseUrl(instanceId);
    const instance = await registry.getInstance(instanceId);
    const verticalPath = `verticals/${instance.verticalId}/backend`;

    // Checkout rollback version
    await execAsync(`cd ${verticalPath} && git checkout ${schemaVersion.rollback_version}`);

    // Run migration to rollback version
    await execAsync(
      `cd ${verticalPath} && npx prisma migrate deploy`,
      { env: { ...process.env, DATABASE_URL: databaseUrl } }
    );

    // Update record
    await db.query(`
      UPDATE instance_schema_versions
      SET migration_status = 'rolled_back',
          current_version = $1,
          target_version = NULL,
          updated_at = NOW()
      WHERE instance_id = $2
    `, [schemaVersion.rollback_version, instanceId]);

    console.log(`✅ Rollback succeeded for instance ${instanceId}`);

  } catch (error) {
    console.error(`❌ Rollback failed for instance ${instanceId}: ${error.message}`);
    throw error;
  }
}
```

### Manual Intervention

For failed migrations requiring manual intervention:

```bash
# scripts/manual-migration.sh
#!/bin/bash

INSTANCE_ID=$1
TARGET_VERSION=$2

echo "🔧 Manual migration for instance $INSTANCE_ID to version $TARGET_VERSION"

# Get database URL from control plane
DATABASE_URL=$(node -e "
  const { getDatabaseUrl } = require('./scripts/get-db-url');
  getDatabaseUrl('$INSTANCE_ID').then(console.log);
")

# Navigate to vertical backend
cd verticals/replyhero/backend

# Set DATABASE_URL
export DATABASE_URL=$DATABASE_URL

# Run migration
npx prisma migrate deploy

# Verify
npx prisma db execute --stdin <<SQL
SELECT version, applied_at FROM _prisma_migrations ORDER BY applied_at DESC LIMIT 5;
SQL

echo "✅ Manual migration complete. Update control plane record manually."
```

---

## Schema Hashing

### Purpose

Schema hashing ensures deployed schema matches expected version.

### Implementation

```typescript
import crypto from 'crypto';
import fs from 'fs';

function computeSchemaHash(verticalId: string, version: string): string {
  const schemaPath = `verticals/${verticalId}/backend/prisma/schema.prisma`;
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  return crypto
    .createHash('sha256')
    .update(schemaContent)
    .digest('hex');
}

async function verifySchemaHash(instanceId: string) {
  const schemaVersion = await db.query(`
    SELECT current_version, schema_hash, vertical_id
    FROM instance_schema_versions
    WHERE instance_id = $1
  `, [instanceId]).then(r => r.rows[0]);

  const expectedHash = computeSchemaHash(schemaVersion.vertical_id, schemaVersion.current_version);

  if (schemaVersion.schema_hash !== expectedHash) {
    console.warn(`⚠️  Schema hash mismatch for instance ${instanceId}`);
    console.warn(`   Expected: ${expectedHash}`);
    console.warn(`   Actual:   ${schemaVersion.schema_hash}`);
    return false;
  }

  return true;
}
```

---

## API Endpoints

### Control Plane API

```typescript
// GET /api/console/instances/:instanceId/schema
export async function GET(req: Request, { params }: { params: { instanceId: string } }) {
  const schemaVersion = await db.query(`
    SELECT *
    FROM instance_schema_versions
    WHERE instance_id = $1
    ORDER BY updated_at DESC
    LIMIT 1
  `, [params.instanceId]).then(r => r.rows[0]);

  return Response.json({ success: true, data: schemaVersion });
}

// POST /api/console/instances/:instanceId/migrate
export async function POST(req: Request, { params }: { params: { instanceId: string } }) {
  const { targetVersion } = await req.json();

  await runMigration(params.instanceId, targetVersion);

  return Response.json({ success: true, message: 'Migration started' });
}

// POST /api/console/instances/:instanceId/rollback
export async function POST(req: Request, { params }: { params: { instanceId: string } }) {
  await rollbackMigration(params.instanceId);

  return Response.json({ success: true, message: 'Rollback initiated' });
}

// GET /api/console/verticals/:verticalId/migration-status
export async function GET(req: Request, { params }: { params: { verticalId: string } }) {
  const status = await db.query(`
    SELECT
      migration_status,
      COUNT(*) as instance_count
    FROM instance_schema_versions
    WHERE vertical_id = $1
    GROUP BY migration_status
  `, [params.verticalId]).then(r => r.rows);

  return Response.json({ success: true, data: status });
}
```

---

## Monitoring & Alerts

### Key Metrics

- **Migration success rate**: % of successful migrations
- **Migration duration**: Time taken per instance
- **Rollback rate**: % of migrations requiring rollback
- **Pending migrations**: Count of instances awaiting migration

### Alert Rules

```typescript
const alerts = {
  migrationFailed: {
    condition: 'migration_status = failed',
    action: 'notify ops team',
    severity: 'high'
  },
  migrationStuck: {
    condition: 'migration_status = in_progress AND migration_started_at < NOW() - INTERVAL \'30 minutes\'',
    action: 'notify ops team',
    severity: 'medium'
  },
  rollbackRequired: {
    condition: 'migration_status = rolled_back',
    action: 'create incident ticket',
    severity: 'high'
  }
};
```

---

## Best Practices

### 1. Always Test Migrations Locally

```bash
# Test migration against local database
cd verticals/replyhero/backend
npx prisma migrate dev --name add_review_sentiment
```

### 2. Use Shadow Database for Testing

```bash
# Prisma will use shadow DB to validate migrations
DATABASE_URL="postgresql://..."
SHADOW_DATABASE_URL="postgresql://...shadow"
npx prisma migrate deploy
```

### 3. Incremental Migrations

Avoid large, risky migrations. Break into small steps:

```
❌ Bad: Add 10 columns + 5 tables + complex indexes in one migration
✅ Good: Add 2 columns → Deploy → Add indexes → Deploy → Add tables
```

### 4. Backwards-Compatible Changes

When possible, make schema changes that don't break existing code:

```
✅ Good: Add nullable column, deploy code, backfill, make non-nullable
❌ Bad: Add non-nullable column (breaks existing inserts)
```

### 5. Monitor Post-Migration

After migration completes, monitor for 24 hours:
- Error rates
- Query performance
- Application logs

---

## Summary

| Component | Purpose |
|-----------|---------|
| **`instance_schema_versions`** | Control plane table tracking schema state |
| **Migration Status** | `current`, `pending`, `in_progress`, `completed`, `failed`, `rolled_back` |
| **Rollout Strategy** | Canary → Batch rollout with soak time |
| **Rollback** | Automatic rollback on failure, manual intervention for edge cases |
| **Verification** | Schema hashing + health checks |
| **Monitoring** | Migration metrics, alerts for failures |

---

## References

- [Strix Platform Architecture](../architecture/STRIX_PLATFORM_ARCHITECTURE.md)
- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Instance Specification Schema](../../schemas/instance-spec.ts)
- [Control Plane API Contract](../console-api-contract.md)
