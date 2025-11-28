# Multi-Region Location Strategy

**Status:** Architecture Specification v1.0
**Last Updated:** 2025-11-28

---

## Overview

The `location_id` field provides a standardized mechanism for identifying where a Strix instance is deployed, enabling multi-region routing, data residency compliance, and intelligent failover strategies.

---

## Location ID Format

### Schema Definition

```
location_id: <cloud>:<region>:<latency_tier>:<env>
```

**Components:**

1. **`cloud`** – Cloud provider or platform identifier
2. **`region`** – Geographic region or availability zone
3. **`latency_tier`** – Performance/proximity tier
4. **`env`** – Environment segment

### Examples

**Vercel + Supabase (Primary Pattern):**

```
vercel:iad1:t1:prod        # Vercel IAD1, Tier 1 latency, Production
vercel:sfo1:t1:prod        # Vercel SFO1, Tier 1 latency, Production
vercel:fra1:t2:staging     # Vercel Frankfurt, Tier 2 latency, Staging
vercel:syd1:t1:prod        # Vercel Sydney, Tier 1 latency, Production
```

**Database-Specific Location IDs:**

```
neon:us-east-1:t1:prod     # Neon US East, Tier 1, Production
neon:eu-central-1:t1:prod  # Neon EU Central, Tier 1, Production
supabase:us-west-2:t1:prod # Supabase US West, Tier 1, Production
```

**Composite Location ID (App + Database):**

When app and database are in different regions, use composite format:

```
vercel:iad1+neon:us-east-1:t1:prod
```

This indicates: Vercel app in IAD1, Neon database in us-east-1, Tier 1 latency, Production.

---

## Cloud Provider Identifiers

### Standard Cloud Codes

| Code | Provider | Notes |
|------|----------|-------|
| `vercel` | Vercel | Default for Next.js deployments |
| `neon` | Neon Postgres | Default for databases |
| `supabase` | Supabase | Alternative database + backend |
| `railway` | Railway | Alternative platform |
| `fly` | Fly.io | Alternative platform |
| `aws` | Amazon Web Services | For direct AWS deployments |
| `gcp` | Google Cloud Platform | For direct GCP deployments |
| `azure` | Microsoft Azure | For direct Azure deployments |
| `do` | DigitalOcean | For DigitalOcean deployments |

### Regional Codes

**Vercel Regions:**

| Code | Location | Description |
|------|----------|-------------|
| `iad1` | Washington, D.C., USA | US East |
| `sfo1` | San Francisco, USA | US West |
| `pdx1` | Portland, USA | US West |
| `dfw1` | Dallas, USA | US Central |
| `lhr1` | London, UK | Europe West |
| `fra1` | Frankfurt, Germany | Europe Central |
| `ams1` | Amsterdam, Netherlands | Europe West |
| `gru1` | São Paulo, Brazil | South America |
| `syd1` | Sydney, Australia | Asia-Pacific |
| `hnd1` | Tokyo, Japan | Asia-Pacific |
| `sin1` | Singapore | Asia-Pacific |
| `bom1` | Mumbai, India | Asia-Pacific |

**Neon Regions:**

| Code | Location | Description |
|------|----------|-------------|
| `us-east-1` | Virginia, USA | US East |
| `us-west-2` | Oregon, USA | US West |
| `eu-central-1` | Frankfurt, Germany | Europe Central |
| `ap-southeast-1` | Singapore | Asia-Pacific |

**Supabase Regions:**

| Code | Location | Description |
|------|----------|-------------|
| `us-east-1` | Virginia, USA | US East |
| `us-west-1` | California, USA | US West |
| `eu-west-1` | Ireland | Europe West |
| `eu-central-1` | Frankfurt, Germany | Europe Central |
| `ap-southeast-1` | Singapore | Asia-Pacific |
| `ap-northeast-1` | Tokyo, Japan | Asia-Pacific |

---

## Latency Tiers

### Tier Definitions

| Tier | Label | RTT | Use Case |
|------|-------|-----|----------|
| `t1` | Ultra-Low | < 50ms | Primary regions, high-traffic markets |
| `t2` | Low | 50-100ms | Secondary regions, moderate traffic |
| `t3` | Medium | 100-200ms | Tertiary regions, low traffic |
| `t4` | High | > 200ms | Edge cases, fallback regions |

### Assignment Strategy

Latency tier is determined by:

1. **Geographic proximity** to target user base
2. **Network performance** measured via synthetic monitoring
3. **Business priority** (premium vs standard customers)

**Example Assignment:**

- US-based tenant → `vercel:iad1:t1:prod` (Tier 1, < 50ms to US users)
- EU-based tenant → `vercel:fra1:t1:prod` (Tier 1, < 50ms to EU users)
- Global tenant → `vercel:iad1:t1:prod` + `vercel:fra1:t1:prod` (Multi-region)

---

## Environment Segments

| Code | Environment | Purpose |
|------|-------------|---------|
| `dev` | Development | Local/team development instances |
| `staging` | Staging | Pre-production testing |
| `prod` | Production | Customer-facing instances |
| `canary` | Canary | Early production rollout |
| `dr` | Disaster Recovery | Hot standby for failover |

---

## Usage Patterns

### 1. Routing

**DNS-Based Routing:**

```typescript
// Route user to nearest instance based on location_id
function routeUser(userCountry: string) {
  const locationMap = {
    'US': 'vercel:iad1:t1:prod',
    'UK': 'vercel:lhr1:t1:prod',
    'DE': 'vercel:fra1:t1:prod',
    'AU': 'vercel:syd1:t1:prod',
    'JP': 'vercel:hnd1:t1:prod'
  };

  return locationMap[userCountry] || 'vercel:iad1:t1:prod'; // Default to US
}
```

**Application-Level Routing:**

```typescript
// In Strix Console or API
async function getInstanceForTenant(tenantId: string, userLocation: string) {
  const instances = await registry.getInstances({
    tenantId,
    environment: 'prod',
    status: 'active'
  });

  // Prefer t1 latency in user's region
  const preferred = instances.find(i =>
    i.locationId.includes(userLocation) &&
    i.locationId.includes(':t1:')
  );

  return preferred || instances[0]; // Fallback to any active instance
}
```

### 2. Data Residency

**Compliance Mapping:**

```typescript
const dataResidencyRules = {
  GDPR: ['vercel:lhr1', 'vercel:fra1', 'vercel:ams1'],
  CCPA: ['vercel:iad1', 'vercel:sfo1', 'vercel:pdx1'],
  LGPD: ['vercel:gru1']
};

function validateDataResidency(locationId: string, regulation: string) {
  const allowedLocations = dataResidencyRules[regulation];
  return allowedLocations.some(prefix => locationId.startsWith(prefix));
}
```

**Enforcement:**

```typescript
// When provisioning instance for EU tenant
async function provisionInstanceWithCompliance(spec: InstanceSpec) {
  if (spec.tenant.region === 'EU' && !spec.locationId.startsWith('vercel:fra1') && !spec.locationId.startsWith('vercel:lhr1')) {
    throw new Error('GDPR requires EU-region deployment');
  }

  return await provisionInstance(spec);
}
```

### 3. Failover Pairing

**Primary-Secondary Pairing:**

```typescript
// Define failover pairs
const failoverPairs = {
  'vercel:iad1:t1:prod': 'vercel:dfw1:t2:prod',  // US East → US Central
  'vercel:fra1:t1:prod': 'vercel:lhr1:t1:prod',  // Frankfurt → London
  'vercel:syd1:t1:prod': 'vercel:sin1:t2:prod'   // Sydney → Singapore
};

// Health check + failover
async function healthCheckWithFailover(primaryLocationId: string) {
  const primary = await getInstanceByLocation(primaryLocationId);

  if (!await isHealthy(primary.healthUrl)) {
    const secondaryLocationId = failoverPairs[primaryLocationId];
    const secondary = await getInstanceByLocation(secondaryLocationId);

    if (await isHealthy(secondary.healthUrl)) {
      await updateDNS(primary.domain, secondary.deploymentUrl);
      await notifyOps(`Failover: ${primaryLocationId} → ${secondaryLocationId}`);
    }
  }
}
```

**Disaster Recovery:**

```typescript
// Create DR instance in paired region
async function createDRInstance(productionLocationId: string) {
  const drLocationId = productionLocationId.replace(':prod', ':dr');

  await provisionInstance({
    ...productionSpec,
    locationId: drLocationId,
    environment: 'dr',
    replicationSource: productionLocationId
  });
}
```

---

## Control Plane Integration

### Database Schema

**Instance Table:**

```sql
ALTER TABLE instances ADD COLUMN location_id TEXT NOT NULL;
CREATE INDEX idx_instances_location_id ON instances(location_id);
CREATE INDEX idx_instances_tenant_location ON instances(tenant_id, location_id);
```

**Location Registry Table:**

```sql
CREATE TABLE location_registry (
  location_id TEXT PRIMARY KEY,
  cloud TEXT NOT NULL,
  region TEXT NOT NULL,
  latency_tier TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  capacity_limit INTEGER,
  current_instances INTEGER DEFAULT 0,
  geo_lat DECIMAL(9,6),
  geo_lon DECIMAL(9,6),
  data_residency_tags TEXT[], -- ['GDPR', 'CCPA']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example rows
INSERT INTO location_registry (location_id, cloud, region, latency_tier, environment, capacity_limit, geo_lat, geo_lon, data_residency_tags) VALUES
  ('vercel:iad1:t1:prod', 'vercel', 'iad1', 't1', 'prod', 1000, 38.9072, -77.0369, ARRAY['CCPA']),
  ('vercel:fra1:t1:prod', 'vercel', 'fra1', 't1', 'prod', 1000, 50.1109, 8.6821, ARRAY['GDPR']),
  ('vercel:syd1:t1:prod', 'vercel', 'syd1', 't1', 'prod', 500, -33.8688, 151.2093, ARRAY[]);
```

### TypeScript Schema

```typescript
// schemas/location.ts
import { z } from 'zod';

export const LocationIdSchema = z.string().regex(
  /^[a-z0-9]+:[a-z0-9-]+:[a-z0-9+]+:t[1-4]:(dev|staging|prod|canary|dr)$/,
  'Invalid location_id format. Expected: cloud:region:latency_tier:env'
);

export const LocationRegistrySchema = z.object({
  locationId: LocationIdSchema,
  cloud: z.string(),
  region: z.string(),
  latencyTier: z.enum(['t1', 't2', 't3', 't4']),
  environment: z.enum(['dev', 'staging', 'prod', 'canary', 'dr']),
  status: z.enum(['active', 'maintenance', 'deprecated']),
  capacityLimit: z.number().int().positive(),
  currentInstances: z.number().int().nonnegative(),
  geoLat: z.number().min(-90).max(90).optional(),
  geoLon: z.number().min(-180).max(180).optional(),
  dataResidencyTags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type LocationRegistry = z.infer<typeof LocationRegistrySchema>;
```

### Instance Specification Update

```typescript
// schemas/instance-spec.ts
import { LocationIdSchema } from './location';

export const InstanceSpecSchema = z.object({
  instanceId: z.string().uuid(),
  verticalId: z.string(),
  tenantId: z.string().uuid(),
  environment: z.enum(['dev', 'staging', 'prod']),
  locationId: LocationIdSchema, // NEW: Required location identifier
  orchestratorMode: z.enum(['pulumi-only', 'kratix']),
  version: z.string(),
  plan: z.string(),
  // ... other fields
});
```

---

## Pulumi Integration

### Stack Configuration

```typescript
// infrastructure/pulumi/index.ts
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const locationId = config.require('locationId'); // e.g., "vercel:iad1:t1:prod"

// Parse location_id
const [cloud, region, latencyTier, env] = locationId.split(':');

// Region-specific configuration
const vercelRegion = region; // "iad1"
const neonRegion = config.get('neonRegion') || 'us-east-1';

// Export location metadata
export const deploymentLocationId = locationId;
export const deploymentCloud = cloud;
export const deploymentRegion = region;
export const deploymentLatencyTier = latencyTier;
export const deploymentEnvironment = env;
```

### Pulumi Stack Naming

Stack names include location for multi-region deployments:

```
strix-{vertical}-{tenant}-{location-region}-{env}

Examples:
  strix-replyhero-acme-iad1-prod
  strix-replyhero-acme-fra1-prod
  strix-replyhero-globex-syd1-prod
```

---

## Monitoring & Telemetry

### Location-Based Metrics

```typescript
// Track metrics per location_id
const metrics = {
  'vercel:iad1:t1:prod': {
    instanceCount: 42,
    avgLatency: 35, // ms
    errorRate: 0.02, // 2%
    uptime: 99.98 // %
  },
  'vercel:fra1:t1:prod': {
    instanceCount: 28,
    avgLatency: 42,
    errorRate: 0.01,
    uptime: 99.99
  }
};
```

### Health Checks

```typescript
// Health check with location awareness
async function healthCheckByLocation(locationId: string) {
  const instances = await registry.getInstancesByLocation(locationId);

  const healthResults = await Promise.all(
    instances.map(async (instance) => {
      const healthy = await fetch(instance.healthUrl).then(r => r.ok);
      return { instanceId: instance.instanceId, healthy };
    })
  );

  const healthyCount = healthResults.filter(r => r.healthy).length;
  const totalCount = healthResults.length;

  return {
    locationId,
    healthyCount,
    totalCount,
    healthPercentage: (healthyCount / totalCount) * 100
  };
}
```

---

## Migration Strategy

### Existing Instances

For instances deployed before `location_id` was introduced:

```sql
-- Backfill location_id based on deployment URLs
UPDATE instances
SET location_id = CASE
  WHEN deployment_url LIKE '%iad1%' THEN 'vercel:iad1:t1:prod'
  WHEN deployment_url LIKE '%sfo1%' THEN 'vercel:sfo1:t1:prod'
  WHEN deployment_url LIKE '%fra1%' THEN 'vercel:fra1:t1:prod'
  ELSE 'vercel:iad1:t1:prod' -- Default
END
WHERE location_id IS NULL;
```

### Validation Script

```typescript
// scripts/validate-location-ids.ts
import { LocationIdSchema } from '../schemas/location';

async function validateAllLocationIds() {
  const instances = await registry.getAllInstances();

  for (const instance of instances) {
    try {
      LocationIdSchema.parse(instance.locationId);
    } catch (error) {
      console.error(`Invalid location_id for instance ${instance.instanceId}: ${instance.locationId}`);
    }
  }
}
```

---

## Best Practices

### 1. Always Specify Location ID

When provisioning new instances, always provide explicit `location_id`:

```typescript
// ✅ Good
await provisionInstance({
  verticalId: 'replyhero',
  tenantId: 'acme-corp',
  environment: 'prod',
  locationId: 'vercel:iad1:t1:prod'
});

// ❌ Bad (no location_id)
await provisionInstance({
  verticalId: 'replyhero',
  tenantId: 'acme-corp',
  environment: 'prod'
});
```

### 2. Validate Before Provisioning

```typescript
function validateLocationId(locationId: string, tenantRequirements: TenantRequirements) {
  // Format validation
  LocationIdSchema.parse(locationId);

  // Data residency validation
  if (tenantRequirements.dataResidency === 'GDPR') {
    if (!locationId.startsWith('vercel:fra1') && !locationId.startsWith('vercel:lhr1')) {
      throw new Error('GDPR requires EU-region deployment');
    }
  }

  // Latency tier validation
  if (tenantRequirements.plan === 'enterprise' && !locationId.includes(':t1:')) {
    throw new Error('Enterprise plan requires Tier 1 latency');
  }
}
```

### 3. Document Location Decisions

Include location rationale in instance metadata:

```typescript
await registry.registerInstance({
  instanceId,
  verticalId,
  tenantId,
  locationId: 'vercel:fra1:t1:prod',
  locationRationale: 'EU tenant with GDPR requirements, majority of users in Germany'
});
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| **`location_id`** | Standardized location identifier (cloud:region:latency_tier:env) |
| **Routing** | Direct users to nearest/fastest instance |
| **Data Residency** | Enforce GDPR, CCPA, LGPD compliance |
| **Failover** | Define primary-secondary region pairs |
| **Capacity** | Track instance density per location |
| **Monitoring** | Location-based health and performance metrics |

---

## References

- [Strix Platform Architecture](../architecture/STRIX_PLATFORM_ARCHITECTURE.md)
- [Instance Specification Schema](../../schemas/instance-spec.ts)
- [Pulumi Stack Configuration](../../infrastructure/pulumi/README.md)
- [Vercel Regions](https://vercel.com/docs/concepts/edge-network/regions)
- [Neon Regions](https://neon.tech/docs/introduction/regions)
