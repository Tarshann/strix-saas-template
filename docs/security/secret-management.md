# Secret Management Standard

**Status:** Architecture Specification v1.0
**Last Updated:** 2025-11-28

---

## Overview

Strix manages secrets (API keys, database credentials, OAuth tokens, etc.) for all tenant instances through a secure, auditable system. The control plane **never stores raw secret values** and instead delegates storage to specialized secret providers.

---

## Architecture Principles

### 1. Control Plane as Metadata Layer

The control plane stores **metadata about secrets** (name, provider, creation date, rotation status) but **never stores raw values**.

### 2. Provider Delegation

Actual secret values are stored in external secret providers:
- **Doppler** (preferred)
- **Vercel Environment Variables**
- **Supabase Vault**
- **AWS Secrets Manager** (future)
- **HashiCorp Vault** (future)

### 3. Zero-Knowledge Architecture

Operators using the Strix Console never see raw secret values in plaintext. Secrets are:
- Created → stored in provider → referenced by ID
- Rotated → new value generated → old value revoked
- Accessed → only by instance runtime (never by humans)

---

## Control Plane Schema

### Instance Secrets Metadata Table

```sql
CREATE TABLE instance_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  secret_key TEXT NOT NULL, -- e.g., "DATABASE_URL", "OPENAI_API_KEY"
  secret_type TEXT NOT NULL, -- "database", "api_key", "oauth_token", "webhook_secret"
  provider TEXT NOT NULL, -- "doppler", "vercel", "supabase_vault"
  provider_secret_id TEXT NOT NULL, -- ID/reference in external provider
  provider_project TEXT, -- Doppler project, Vercel project ID, etc.
  provider_environment TEXT, -- "dev", "staging", "prod"
  rotation_policy TEXT, -- "manual", "30d", "90d", "180d"
  last_rotated_at TIMESTAMPTZ,
  next_rotation_at TIMESTAMPTZ,
  rotation_status TEXT DEFAULT 'active', -- "active", "rotating", "revoked"
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_instance_secret_key UNIQUE(instance_id, secret_key),
  CONSTRAINT valid_secret_type CHECK (
    secret_type IN ('database', 'api_key', 'oauth_token', 'oauth_client_secret', 'webhook_secret', 'encryption_key', 'signing_key')
  ),
  CONSTRAINT valid_provider CHECK (
    provider IN ('doppler', 'vercel', 'supabase_vault', 'aws_secrets_manager', 'vault')
  ),
  CONSTRAINT valid_rotation_status CHECK (
    rotation_status IN ('active', 'rotating', 'revoked', 'expired')
  )
);

CREATE INDEX idx_instance_secrets_instance ON instance_secrets(instance_id);
CREATE INDEX idx_instance_secrets_provider ON instance_secrets(provider, provider_secret_id);
CREATE INDEX idx_instance_secrets_rotation ON instance_secrets(next_rotation_at) WHERE rotation_status = 'active';
```

### Audit Log Table

```sql
CREATE TABLE secret_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_secret_id UUID NOT NULL REFERENCES instance_secrets(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- "created", "rotated", "revoked", "accessed", "failed_rotation"
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- Additional context (IP, user agent, reason, etc.)
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

CREATE INDEX idx_secret_audit_log_secret ON secret_audit_log(instance_secret_id);
CREATE INDEX idx_secret_audit_log_action ON secret_audit_log(action, performed_at);
```

---

## Supported Providers

### 1. Doppler (Preferred)

**Why Doppler:**
- ✅ Native secret versioning
- ✅ Automatic sync to Vercel/GitHub Actions
- ✅ Branch-based environments (dev/staging/prod)
- ✅ Audit logs built-in
- ✅ Rotation tracking
- ✅ CLI + API for automation

**Configuration:**

```typescript
// config/doppler.ts
export const dopplerConfig = {
  apiKey: process.env.DOPPLER_TOKEN,
  baseUrl: 'https://api.doppler.com/v3',
  defaultProject: 'strix',
  environments: {
    dev: 'dev',
    staging: 'staging',
    prod: 'prod'
  }
};
```

**Create Secret:**

```typescript
import axios from 'axios';

async function createDopplerSecret(params: {
  project: string;
  environment: string;
  key: string;
  value: string;
}) {
  const response = await axios.post(
    `${dopplerConfig.baseUrl}/configs/config/secrets`,
    {
      project: params.project,
      config: params.environment,
      secrets: {
        [params.key]: params.value
      }
    },
    {
      headers: {
        Authorization: `Bearer ${dopplerConfig.apiKey}`
      }
    }
  );

  return response.data;
}
```

**Read Secret:**

```typescript
async function getDopplerSecret(params: {
  project: string;
  environment: string;
  key: string;
}): Promise<string> {
  const response = await axios.get(
    `${dopplerConfig.baseUrl}/configs/config/secrets`,
    {
      params: {
        project: params.project,
        config: params.environment
      },
      headers: {
        Authorization: `Bearer ${dopplerConfig.apiKey}`
      }
    }
  );

  return response.data.secrets[params.key];
}
```

### 2. Vercel Environment Variables

**Use Case:** Direct integration with Vercel deployments

**Create Secret:**

```typescript
async function createVercelEnvVar(params: {
  projectId: string;
  key: string;
  value: string;
  target: 'production' | 'preview' | 'development';
}) {
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${params.projectId}/env`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: params.key,
        value: params.value,
        target: [params.target],
        type: 'encrypted'
      })
    }
  );

  return await response.json();
}
```

**Update Secret:**

```typescript
async function updateVercelEnvVar(params: {
  projectId: string;
  envId: string;
  value: string;
}) {
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${params.projectId}/env/${params.envId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: params.value })
    }
  );

  return await response.json();
}
```

### 3. Supabase Vault

**Use Case:** Secrets for Supabase-hosted backends

**Create Secret:**

```typescript
async function createSupabaseSecret(params: {
  projectRef: string;
  name: string;
  value: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('vault.secrets')
    .insert({
      name: params.name,
      secret: params.value
    });

  if (error) throw error;
  return data;
}
```

**Access Secret (from SQL):**

```sql
-- Access secret in Supabase function
SELECT vault.read_secret('DATABASE_URL');
```

---

## Secret Rotation Flow

### Automated Rotation

```
1. Generate new secret value
   ↓
2. Write new value to provider
   ↓
3. Trigger redeployment (to load new env var)
   ↓
4. Wait for deployment completion
   ↓
5. Verify new secret works (health check)
   ↓
6. Revoke old secret value
   ↓
7. Update control plane metadata
```

### Implementation

```typescript
async function rotateSecret(instanceSecretId: string) {
  // Step 1: Fetch secret metadata
  const secret = await db.query(`
    SELECT * FROM instance_secrets WHERE id = $1
  `, [instanceSecretId]).then(r => r.rows[0]);

  // Step 2: Mark as rotating
  await db.query(`
    UPDATE instance_secrets
    SET rotation_status = 'rotating',
        updated_at = NOW()
    WHERE id = $1
  `, [instanceSecretId]);

  try {
    // Step 3: Generate new value
    const newValue = generateSecretValue(secret.secret_type);

    // Step 4: Write to provider
    await writeSecretToProvider({
      provider: secret.provider,
      projectId: secret.provider_project,
      environment: secret.provider_environment,
      key: secret.secret_key,
      value: newValue
    });

    // Step 5: Trigger redeployment
    const instance = await registry.getInstance(secret.instance_id);
    await triggerRedeployment(instance);

    // Step 6: Wait for deployment
    await waitForDeployment(instance.instanceId);

    // Step 7: Verify health
    const healthy = await verifyInstanceHealth(instance.instanceId);

    if (!healthy) {
      throw new Error('Health check failed after rotation');
    }

    // Step 8: Update metadata
    await db.query(`
      UPDATE instance_secrets
      SET rotation_status = 'active',
          last_rotated_at = NOW(),
          next_rotation_at = NOW() + INTERVAL '30 days',
          updated_at = NOW()
      WHERE id = $1
    `, [instanceSecretId]);

    // Step 9: Audit log
    await db.query(`
      INSERT INTO secret_audit_log (instance_secret_id, action, performed_by, success)
      VALUES ($1, 'rotated', $2, true)
    `, [instanceSecretId, getCurrentUserId()]);

    console.log(`✅ Secret rotated successfully: ${secret.secret_key}`);

  } catch (error) {
    // Rollback: keep old secret active
    await db.query(`
      UPDATE instance_secrets
      SET rotation_status = 'active',
          updated_at = NOW()
      WHERE id = $1
    `, [instanceSecretId]);

    // Log failure
    await db.query(`
      INSERT INTO secret_audit_log (instance_secret_id, action, performed_by, success, error_message)
      VALUES ($1, 'failed_rotation', $2, false, $3)
    `, [instanceSecretId, getCurrentUserId(), error.message]);

    throw error;
  }
}
```

### Rotation Policies

```typescript
const rotationPolicies = {
  manual: null, // No automatic rotation
  '30d': 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  '90d': 90 * 24 * 60 * 60 * 1000, // 90 days in ms
  '180d': 180 * 24 * 60 * 60 * 1000 // 180 days in ms
};

// Cron job to check for secrets needing rotation
async function checkRotationSchedule() {
  const secretsToRotate = await db.query(`
    SELECT id
    FROM instance_secrets
    WHERE rotation_status = 'active'
      AND rotation_policy != 'manual'
      AND next_rotation_at <= NOW()
  `).then(r => r.rows);

  for (const secret of secretsToRotate) {
    try {
      await rotateSecret(secret.id);
    } catch (error) {
      console.error(`Failed to rotate secret ${secret.id}: ${error.message}`);
    }
  }
}
```

---

## Secret Types & Generation

### API Keys

```typescript
function generateApiKey(): string {
  const prefix = 'sk_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}${randomBytes}`;
}
```

### Webhook Secrets

```typescript
function generateWebhookSecret(): string {
  const prefix = 'whsec_';
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  return `${prefix}${randomBytes}`;
}
```

### Encryption Keys

```typescript
function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
```

### JWT Secrets

```typescript
function generateJwtSecret(): string {
  return crypto.randomBytes(64).toString('base64');
}
```

---

## Provider Abstraction Layer

### Universal Secret Manager Interface

```typescript
interface SecretProvider {
  create(params: CreateSecretParams): Promise<string>; // Returns provider_secret_id
  read(secretId: string): Promise<string>; // Returns raw value
  update(secretId: string, newValue: string): Promise<void>;
  delete(secretId: string): Promise<void>;
  list(projectId: string, environment: string): Promise<Secret[]>;
}

class DopplerProvider implements SecretProvider {
  async create(params: CreateSecretParams): Promise<string> {
    await createDopplerSecret(params);
    return `${params.project}:${params.environment}:${params.key}`;
  }

  async read(secretId: string): Promise<string> {
    const [project, environment, key] = secretId.split(':');
    return await getDopplerSecret({ project, environment, key });
  }

  async update(secretId: string, newValue: string): Promise<void> {
    const [project, environment, key] = secretId.split(':');
    await createDopplerSecret({ project, environment, key, value: newValue });
  }

  async delete(secretId: string): Promise<void> {
    const [project, environment, key] = secretId.split(':');
    await deleteDopplerSecret({ project, environment, key });
  }

  async list(projectId: string, environment: string): Promise<Secret[]> {
    return await listDopplerSecrets({ project: projectId, config: environment });
  }
}

class VercelProvider implements SecretProvider {
  // Similar implementation for Vercel
}

class SupabaseVaultProvider implements SecretProvider {
  // Similar implementation for Supabase
}

// Factory
function getSecretProvider(providerName: string): SecretProvider {
  switch (providerName) {
    case 'doppler':
      return new DopplerProvider();
    case 'vercel':
      return new VercelProvider();
    case 'supabase_vault':
      return new SupabaseVaultProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}
```

### Usage

```typescript
async function createInstanceSecret(params: {
  instanceId: string;
  secretKey: string;
  secretType: string;
  provider: string;
  value: string;
}) {
  const instance = await registry.getInstance(params.instanceId);
  const secretProvider = getSecretProvider(params.provider);

  // Write to provider
  const providerSecretId = await secretProvider.create({
    project: instance.verticalId,
    environment: instance.environment,
    key: params.secretKey,
    value: params.value
  });

  // Store metadata in control plane
  await db.query(`
    INSERT INTO instance_secrets (
      instance_id, secret_key, secret_type, provider, provider_secret_id,
      provider_project, provider_environment, rotation_policy, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    params.instanceId,
    params.secretKey,
    params.secretType,
    params.provider,
    providerSecretId,
    instance.verticalId,
    instance.environment,
    '90d', // Default 90-day rotation
    getCurrentUserId()
  ]);

  // Audit log
  await db.query(`
    INSERT INTO secret_audit_log (instance_secret_id, action, performed_by)
    VALUES (
      (SELECT id FROM instance_secrets WHERE instance_id = $1 AND secret_key = $2),
      'created',
      $3
    )
  `, [params.instanceId, params.secretKey, getCurrentUserId()]);
}
```

---

## Control Plane Never Stores Raw Values

### ❌ NEVER Do This

```typescript
// BAD: Storing raw secrets in control plane database
await db.query(`
  INSERT INTO secrets (instance_id, key, value)
  VALUES ($1, $2, $3)
`, [instanceId, 'OPENAI_API_KEY', 'sk-proj-abc123...']); // ❌ NEVER
```

### ✅ Always Do This

```typescript
// GOOD: Store metadata only, delegate storage to provider
const providerSecretId = await secretProvider.create({
  project: 'replyhero',
  environment: 'prod',
  key: 'OPENAI_API_KEY',
  value: 'sk-proj-abc123...'
});

await db.query(`
  INSERT INTO instance_secrets (instance_id, secret_key, provider, provider_secret_id)
  VALUES ($1, $2, $3, $4)
`, [instanceId, 'OPENAI_API_KEY', 'doppler', providerSecretId]); // ✅ Good
```

---

## API Endpoints

### Control Plane API

```typescript
// GET /api/console/instances/:instanceId/secrets
export async function GET(req: Request, { params }: { params: { instanceId: string } }) {
  const secrets = await db.query(`
    SELECT id, secret_key, secret_type, provider, rotation_policy, last_rotated_at, rotation_status
    FROM instance_secrets
    WHERE instance_id = $1
  `, [params.instanceId]).then(r => r.rows);

  // NEVER return raw values
  return Response.json({ success: true, data: secrets });
}

// POST /api/console/instances/:instanceId/secrets
export async function POST(req: Request, { params }: { params: { instanceId: string } }) {
  const { secretKey, secretType, provider, value } = await req.json();

  await createInstanceSecret({
    instanceId: params.instanceId,
    secretKey,
    secretType,
    provider,
    value
  });

  return Response.json({ success: true, message: 'Secret created' });
}

// POST /api/console/secrets/:secretId/rotate
export async function POST(req: Request, { params }: { params: { secretId: string } }) {
  await rotateSecret(params.secretId);

  return Response.json({ success: true, message: 'Secret rotated' });
}

// DELETE /api/console/secrets/:secretId
export async function DELETE(req: Request, { params }: { params: { secretId: string } }) {
  await revokeSecret(params.secretId);

  return Response.json({ success: true, message: 'Secret revoked' });
}
```

---

## Security Best Practices

### 1. Principle of Least Privilege

Only grant access to secrets when absolutely necessary:

```typescript
// Good: Instance runtime accesses its own secrets
const secret = await secretProvider.read(instance.secretId);

// Bad: Control plane operator accesses production secrets
const secret = await secretProvider.read(prodSecretId); // ❌ Avoid
```

### 2. Audit All Access

Every secret access is logged:

```typescript
async function logSecretAccess(secretId: string, accessedBy: string) {
  await db.query(`
    INSERT INTO secret_audit_log (instance_secret_id, action, performed_by, metadata)
    VALUES ($1, 'accessed', $2, $3)
  `, [secretId, accessedBy, JSON.stringify({ timestamp: new Date(), ip: getClientIp() })]);
}
```

### 3. Encrypt at Rest

All secret providers must support encryption at rest:
- Doppler: ✅ AES-256
- Vercel: ✅ Encrypted
- Supabase Vault: ✅ Encrypted

### 4. Rotate Regularly

```typescript
const recommendedRotationPolicies = {
  database: '90d', // Quarterly
  api_key: '30d', // Monthly
  oauth_token: 'manual', // Refresh token handles this
  webhook_secret: '180d', // Biannually
  encryption_key: 'manual', // Rare, coordinated rotation
  signing_key: 'manual' // Rare, coordinated rotation
};
```

### 5. Use Different Secrets Per Environment

```typescript
// Good: Different secrets per environment
{
  dev: 'sk_test_abc123',
  staging: 'sk_test_def456',
  prod: 'sk_live_xyz789'
}

// Bad: Same secret across environments
{
  dev: 'sk_live_xyz789', // ❌ Production key in dev!
  staging: 'sk_live_xyz789',
  prod: 'sk_live_xyz789'
}
```

---

## Monitoring & Alerts

### Key Metrics

- **Secret rotation compliance**: % of secrets rotated on schedule
- **Failed rotations**: Count of rotation failures
- **Expiring secrets**: Secrets nearing expiration
- **Unauthorized access attempts**: Failed secret access attempts

### Alert Rules

```typescript
const alerts = {
  secretExpiringSoon: {
    condition: 'next_rotation_at < NOW() + INTERVAL \'7 days\'',
    action: 'notify ops team',
    severity: 'medium'
  },
  failedRotation: {
    condition: 'rotation_status = rotating AND updated_at < NOW() - INTERVAL \'1 hour\'',
    action: 'escalate to oncall',
    severity: 'high'
  },
  expiredSecret: {
    condition: 'next_rotation_at < NOW() AND rotation_policy != manual',
    action: 'disable instance, notify ops',
    severity: 'critical'
  }
};
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| **`instance_secrets`** | Control plane metadata table (NO raw values) |
| **Secret Providers** | Doppler (preferred), Vercel, Supabase Vault |
| **Rotation Flow** | Generate → Write → Redeploy → Verify → Revoke |
| **Audit Log** | Track all secret operations |
| **Zero-Knowledge** | Control plane never sees raw values |

---

## References

- [Strix Platform Architecture](../architecture/STRIX_PLATFORM_ARCHITECTURE.md)
- [Instance Specification Schema](../../schemas/instance-spec.ts)
- [Doppler API Documentation](https://docs.doppler.com/reference/api)
- [Vercel Environment Variables API](https://vercel.com/docs/rest-api/endpoints/projects#environment-variables)
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
