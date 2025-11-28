# Cost Allocation Framework

**Status:** Architecture Specification v1.0
**Last Updated:** 2025-11-28

---

## Overview

The Strix Cost Allocation Framework provides visibility into infrastructure costs per tenant, vertical, and environment. This enables accurate cost tracking, margin analysis, and fair tenant billing.

---

## Tagging Standard

### Resource Tags

All infrastructure resources provisioned by Strix **must** include the following tags:

```typescript
interface StrixResourceTags {
  strix_tenant_id: string;      // UUID of tenant
  strix_vertical_id: string;    // Vertical slug (e.g., "replyhero")
  strix_instance_id: string;    // Instance UUID
  strix_env: 'dev' | 'staging' | 'prod' | 'canary' | 'dr';
  strix_location_id: string;    // Location identifier (e.g., "vercel:iad1:t1:prod")
  strix_cost_center?: string;   // Optional: business unit or cost center
}
```

### Naming Pattern

Resource names follow a consistent pattern to enable cost grouping:

```
strix-{vertical}-{tenant}-{env}

Examples:
  strix-replyhero-acme-prod
  strix-replyhero-globex-staging
  strix-leadcapture-techcorp-prod
```

---

## Infrastructure Tagging

### Pulumi Tagging

All Pulumi-provisioned resources automatically receive tags:

```typescript
// infrastructure/pulumi/index.ts
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();

// Standard tags applied to all resources
export const strixTags = {
  strix_tenant_id: config.require('tenantId'),
  strix_vertical_id: config.require('verticalId'),
  strix_instance_id: config.require('instanceId'),
  strix_env: config.require('environment'),
  strix_location_id: config.require('locationId'),
  strix_managed: 'true',
  strix_platform_version: '1.0',
};

// Apply tags to Vercel project
const vercelProject = new vercel.Project('app', {
  name: `strix-${config.require('verticalId')}-${config.require('tenantSlug')}`,
  framework: 'nextjs',
  environmentVariables: [
    {
      key: 'STRIX_TENANT_ID',
      value: config.require('tenantId'),
      target: ['production']
    }
  ]
});

// Apply tags to Neon database
const neonDatabase = new neon.Database('db', {
  name: `strix-${config.require('verticalId')}-${config.require('tenantSlug')}`,
  tags: strixTags
});
```

### Vercel Tagging

Vercel projects are tagged via environment variables and project metadata:

```typescript
async function tagVercelProject(projectId: string, tags: StrixResourceTags) {
  // Add tags as environment variables for tracking
  await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: 'STRIX_TAGS',
      value: JSON.stringify(tags),
      target: ['production', 'preview', 'development'],
      type: 'plain'
    })
  });
}
```

### Neon Database Tagging

Neon databases support tags via API:

```typescript
async function tagNeonDatabase(projectId: string, tags: StrixResourceTags) {
  await fetch(`https://console.neon.tech/api/v2/projects/${projectId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.NEON_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tags: tags
    })
  });
}
```

---

## Cost Data Sources

### 1. Vercel Usage API

**Ingestion Frequency:** Daily

```typescript
async function fetchVercelUsage(teamId: string, since: string, until: string) {
  const response = await fetch(
    `https://api.vercel.com/v1/integrations/usage?teamId=${teamId}&since=${since}&until=${until}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
      }
    }
  );

  const usage = await response.json();

  // Usage metrics per project
  return usage.projects.map((project: any) => ({
    projectId: project.id,
    projectName: project.name,
    bandwidth: project.bandwidth, // bytes
    buildTime: project.buildExecutionTimeMinutes, // minutes
    functionInvocations: project.functionInvocations,
    functionDuration: project.functionDurationMs, // milliseconds
    edgeRequests: project.edgeRequests,
    cost: calculateVercelCost(project)
  }));
}

function calculateVercelCost(project: any): number {
  // Vercel pricing (example rates)
  const bandwidthCostPerGB = 0.10; // $0.10/GB
  const buildTimeCostPerMinute = 0.01; // $0.01/min
  const functionInvocationCost = 0.000002; // $0.000002 per invocation
  const edgeRequestCost = 0.0000001; // $0.0000001 per request

  const bandwidthGB = project.bandwidth / (1024 ** 3);
  const buildTimeMinutes = project.buildExecutionTimeMinutes;
  const functionInvocations = project.functionInvocations;
  const edgeRequests = project.edgeRequests;

  return (
    bandwidthGB * bandwidthCostPerGB +
    buildTimeMinutes * buildTimeCostPerMinute +
    functionInvocations * functionInvocationCost +
    edgeRequests * edgeRequestCost
  );
}
```

### 2. Neon Database Usage API

**Ingestion Frequency:** Daily

```typescript
async function fetchNeonUsage(projectId: string, from: string, to: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/consumption`,
    {
      headers: {
        Authorization: `Bearer ${process.env.NEON_API_KEY}`
      }
    }
  );

  const consumption = await response.json();

  return {
    projectId,
    activeTime: consumption.active_time_seconds,
    computeTime: consumption.compute_time_seconds,
    writtenData: consumption.written_data_bytes,
    dataTransfer: consumption.data_transfer_bytes,
    dataStorage: consumption.data_storage_bytes_hour,
    cost: calculateNeonCost(consumption)
  };
}

function calculateNeonCost(consumption: any): number {
  // Neon pricing (example rates)
  const computeTimeCostPerHour = 0.10; // $0.10/hour
  const storageCostPerGB = 0.15; // $0.15/GB-month
  const dataTransferCostPerGB = 0.09; // $0.09/GB

  const computeHours = consumption.compute_time_seconds / 3600;
  const storageGB = consumption.data_storage_bytes_hour / (1024 ** 3) / 730; // Convert to GB-month
  const transferGB = consumption.data_transfer_bytes / (1024 ** 3);

  return (
    computeHours * computeTimeCostPerHour +
    storageGB * storageCostPerGB +
    transferGB * dataTransferCostPerGB
  );
}
```

### 3. Supabase Usage API

**Ingestion Frequency:** Daily

```typescript
async function fetchSupabaseUsage(projectRef: string, from: string, to: string) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/usage`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`
      }
    }
  );

  const usage = await response.json();

  return {
    projectRef,
    databaseSize: usage.db_size,
    storageSize: usage.storage_size,
    bandwidth: usage.bandwidth,
    authUsers: usage.auth_users,
    realtimeConnections: usage.realtime_connections,
    cost: calculateSupabaseCost(usage)
  };
}
```

### 4. Stripe Payment Processing Fees

**Ingestion Frequency:** Daily (via webhooks)

```typescript
async function ingestStripeFeesFromWebhook(charge: Stripe.Charge) {
  const fee = charge.balance_transaction?.fee || 0;
  const feeInDollars = fee / 100; // Stripe amounts are in cents

  await db.query(`
    INSERT INTO raw_cost_events (
      resource_type, resource_id, cost_type, amount, currency, occurred_at, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    'stripe_payment',
    charge.id,
    'payment_processing_fee',
    feeInDollars,
    charge.currency,
    new Date(charge.created * 1000),
    JSON.stringify({
      customer_id: charge.customer,
      tenant_id: charge.metadata.tenant_id, // Assumes tenant_id in metadata
      vertical_id: charge.metadata.vertical_id
    })
  ]);
}
```

### 5. Cloud Billing Exports

For direct cloud provider billing (AWS, GCP, Azure):

```typescript
async function ingestCloudBillingExport(billingExportPath: string) {
  // Read CSV/JSON billing export from S3/GCS/Azure Blob
  const billingData = await readBillingExport(billingExportPath);

  for (const item of billingData) {
    // Match by resource tags
    if (item.tags.strix_tenant_id) {
      await db.query(`
        INSERT INTO raw_cost_events (
          resource_type, resource_id, cost_type, amount, currency, occurred_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        item.resourceType,
        item.resourceId,
        'cloud_resource',
        item.cost,
        item.currency,
        item.usageDate,
        JSON.stringify({
          tenant_id: item.tags.strix_tenant_id,
          vertical_id: item.tags.strix_vertical_id,
          instance_id: item.tags.strix_instance_id,
          environment: item.tags.strix_env
        })
      ]);
    }
  }
}
```

---

## Control Plane Schema

### Raw Cost Events Table

```sql
CREATE TABLE raw_cost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL, -- "vercel_project", "neon_database", "supabase_project", "stripe_payment", "cloud_resource"
  resource_id TEXT NOT NULL,
  cost_type TEXT NOT NULL, -- "compute", "storage", "bandwidth", "payment_processing_fee"
  amount DECIMAL(12, 4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- tenant_id, vertical_id, instance_id, environment

  CONSTRAINT valid_cost_type CHECK (
    cost_type IN ('compute', 'storage', 'bandwidth', 'build_time', 'function_invocations', 'payment_processing_fee', 'cloud_resource')
  )
);

CREATE INDEX idx_cost_events_occurred_at ON raw_cost_events(occurred_at);
CREATE INDEX idx_cost_events_resource ON raw_cost_events(resource_type, resource_id);
CREATE INDEX idx_cost_events_metadata_tenant ON raw_cost_events((metadata->>'tenant_id'));
CREATE INDEX idx_cost_events_metadata_vertical ON raw_cost_events((metadata->>'vertical_id'));
```

### Tenant Monthly Costs Table

```sql
CREATE TABLE tenant_monthly_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vertical_id TEXT NOT NULL,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month (e.g., 2025-01-01)

  -- Cost breakdown
  vercel_cost DECIMAL(12, 4) DEFAULT 0,
  neon_cost DECIMAL(12, 4) DEFAULT 0,
  supabase_cost DECIMAL(12, 4) DEFAULT 0,
  stripe_fees DECIMAL(12, 4) DEFAULT 0,
  other_costs DECIMAL(12, 4) DEFAULT 0,
  total_cost DECIMAL(12, 4) GENERATED ALWAYS AS (
    vercel_cost + neon_cost + supabase_cost + stripe_fees + other_costs
  ) STORED,

  -- Revenue (if tracked)
  revenue DECIMAL(12, 4) DEFAULT 0,
  margin DECIMAL(12, 4) GENERATED ALWAYS AS (revenue - total_cost) STORED,
  margin_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN revenue > 0 THEN ((revenue - total_cost) / revenue * 100) ELSE NULL END
  ) STORED,

  currency TEXT NOT NULL DEFAULT 'USD',
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_tenant_month UNIQUE(tenant_id, vertical_id, instance_id, month)
);

CREATE INDEX idx_tenant_monthly_costs_tenant ON tenant_monthly_costs(tenant_id);
CREATE INDEX idx_tenant_monthly_costs_vertical ON tenant_monthly_costs(vertical_id);
CREATE INDEX idx_tenant_monthly_costs_month ON tenant_monthly_costs(month);
```

---

## Nightly Aggregation Job

### n8n Workflow

**Trigger:** Daily at 2:00 AM UTC

**Steps:**

1. Fetch usage data from all providers (Vercel, Neon, Supabase, Stripe)
2. Write raw events to `raw_cost_events`
3. Aggregate raw events by tenant/vertical/month
4. Upsert into `tenant_monthly_costs`
5. Send cost alert notifications if threshold exceeded

### Implementation

```typescript
// scripts/aggregate-costs.ts

async function aggregateMonthlyCosts(month: string) {
  const startOfMonth = new Date(month);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  console.log(`📊 Aggregating costs for ${month}...`);

  // Aggregate costs per tenant/vertical/instance
  await db.query(`
    INSERT INTO tenant_monthly_costs (
      tenant_id, vertical_id, instance_id, month,
      vercel_cost, neon_cost, supabase_cost, stripe_fees, other_costs
    )
    SELECT
      (metadata->>'tenant_id')::UUID as tenant_id,
      metadata->>'vertical_id' as vertical_id,
      (metadata->>'instance_id')::UUID as instance_id,
      DATE_TRUNC('month', occurred_at) as month,
      SUM(CASE WHEN resource_type = 'vercel_project' THEN amount ELSE 0 END) as vercel_cost,
      SUM(CASE WHEN resource_type = 'neon_database' THEN amount ELSE 0 END) as neon_cost,
      SUM(CASE WHEN resource_type = 'supabase_project' THEN amount ELSE 0 END) as supabase_cost,
      SUM(CASE WHEN resource_type = 'stripe_payment' THEN amount ELSE 0 END) as stripe_fees,
      SUM(CASE WHEN resource_type NOT IN ('vercel_project', 'neon_database', 'supabase_project', 'stripe_payment') THEN amount ELSE 0 END) as other_costs
    FROM raw_cost_events
    WHERE occurred_at >= $1 AND occurred_at < $2
      AND metadata->>'tenant_id' IS NOT NULL
    GROUP BY tenant_id, vertical_id, instance_id, month
    ON CONFLICT (tenant_id, vertical_id, instance_id, month)
    DO UPDATE SET
      vercel_cost = EXCLUDED.vercel_cost,
      neon_cost = EXCLUDED.neon_cost,
      supabase_cost = EXCLUDED.supabase_cost,
      stripe_fees = EXCLUDED.stripe_fees,
      other_costs = EXCLUDED.other_costs,
      last_updated_at = NOW()
  `, [startOfMonth, endOfMonth]);

  console.log(`✅ Aggregation complete for ${month}`);
}

// Run for current and previous month
async function runNightlyAggregation() {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];

  await aggregateMonthlyCosts(currentMonth);
  await aggregateMonthlyCosts(previousMonth);

  // Send alerts for high-cost tenants
  await sendCostAlerts();
}
```

### Cost Alerts

```typescript
async function sendCostAlerts() {
  const highCostTenants = await db.query(`
    SELECT
      t.name as tenant_name,
      tmc.vertical_id,
      tmc.total_cost,
      tmc.month
    FROM tenant_monthly_costs tmc
    JOIN tenants t ON t.id = tmc.tenant_id
    WHERE tmc.month = DATE_TRUNC('month', CURRENT_DATE)
      AND tmc.total_cost > 1000 -- Alert threshold: $1000
    ORDER BY tmc.total_cost DESC
  `).then(r => r.rows);

  for (const tenant of highCostTenants) {
    await sendAlert({
      type: 'high_monthly_cost',
      severity: 'medium',
      message: `Tenant ${tenant.tenant_name} (${tenant.vertical_id}) has incurred $${tenant.total_cost.toFixed(2)} in ${tenant.month}`,
      metadata: tenant
    });
  }
}
```

---

## Cost Reporting API

### Control Plane API

```typescript
// GET /api/console/costs/tenant/:tenantId
export async function GET(req: Request, { params }: { params: { tenantId: string } }) {
  const costs = await db.query(`
    SELECT
      vertical_id,
      month,
      vercel_cost,
      neon_cost,
      supabase_cost,
      stripe_fees,
      other_costs,
      total_cost,
      revenue,
      margin,
      margin_percentage
    FROM tenant_monthly_costs
    WHERE tenant_id = $1
    ORDER BY month DESC
    LIMIT 12
  `, [params.tenantId]).then(r => r.rows);

  return Response.json({ success: true, data: costs });
}

// GET /api/console/costs/vertical/:verticalId
export async function GET(req: Request, { params }: { params: { verticalId: string } }) {
  const costs = await db.query(`
    SELECT
      month,
      COUNT(DISTINCT tenant_id) as tenant_count,
      SUM(vercel_cost) as total_vercel_cost,
      SUM(neon_cost) as total_neon_cost,
      SUM(supabase_cost) as total_supabase_cost,
      SUM(stripe_fees) as total_stripe_fees,
      SUM(total_cost) as total_cost,
      SUM(revenue) as total_revenue,
      SUM(margin) as total_margin
    FROM tenant_monthly_costs
    WHERE vertical_id = $1
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `, [params.verticalId]).then(r => r.rows);

  return Response.json({ success: true, data: costs });
}

// GET /api/console/costs/summary
export async function GET(req: Request) {
  const summary = await db.query(`
    SELECT
      DATE_TRUNC('month', CURRENT_DATE) as current_month,
      (SELECT SUM(total_cost) FROM tenant_monthly_costs WHERE month = DATE_TRUNC('month', CURRENT_DATE)) as current_month_cost,
      (SELECT SUM(total_cost) FROM tenant_monthly_costs WHERE month = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')) as last_month_cost,
      (SELECT COUNT(DISTINCT tenant_id) FROM tenant_monthly_costs WHERE month = DATE_TRUNC('month', CURRENT_DATE)) as active_tenants,
      (SELECT AVG(total_cost) FROM tenant_monthly_costs WHERE month = DATE_TRUNC('month', CURRENT_DATE)) as avg_cost_per_tenant
  `).then(r => r.rows[0]);

  return Response.json({ success: true, data: summary });
}
```

---

## Cost Optimization Strategies

### 1. Identify High-Cost Tenants

```sql
SELECT
  t.name,
  tmc.vertical_id,
  tmc.total_cost,
  tmc.revenue,
  tmc.margin_percentage
FROM tenant_monthly_costs tmc
JOIN tenants t ON t.id = tmc.tenant_id
WHERE tmc.month = DATE_TRUNC('month', CURRENT_DATE)
  AND tmc.margin_percentage < 30 -- Low margin threshold
ORDER BY tmc.total_cost DESC
LIMIT 10;
```

### 2. Detect Cost Anomalies

```sql
-- Compare current month to last month
SELECT
  tenant_id,
  vertical_id,
  current_month.total_cost as current_cost,
  last_month.total_cost as last_month_cost,
  ((current_month.total_cost - last_month.total_cost) / last_month.total_cost * 100) as cost_increase_percentage
FROM tenant_monthly_costs current_month
LEFT JOIN tenant_monthly_costs last_month
  ON current_month.tenant_id = last_month.tenant_id
  AND current_month.vertical_id = last_month.vertical_id
  AND last_month.month = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
WHERE current_month.month = DATE_TRUNC('month', CURRENT_DATE)
  AND ((current_month.total_cost - last_month.total_cost) / last_month.total_cost * 100) > 50 -- 50% increase
ORDER BY cost_increase_percentage DESC;
```

### 3. Right-Size Resources

```typescript
async function recommendRightSizing(tenantId: string) {
  const usage = await getInstanceUsage(tenantId);

  const recommendations = [];

  // Low utilization → downgrade
  if (usage.cpu < 20 && usage.memory < 30) {
    recommendations.push({
      type: 'downgrade_plan',
      reason: 'Low resource utilization',
      potential_savings: 50 // USD per month
    });
  }

  // High storage, low compute → optimize storage tier
  if (usage.storage > 100 && usage.computeHours < 10) {
    recommendations.push({
      type: 'optimize_storage',
      reason: 'High storage, low compute usage',
      potential_savings: 20
    });
  }

  return recommendations;
}
```

---

## Tenant Billing Integration

### Add Cost to Invoice

```typescript
async function generateTenantInvoice(tenantId: string, month: string) {
  const costs = await db.query(`
    SELECT * FROM tenant_monthly_costs
    WHERE tenant_id = $1 AND month = $2
  `, [tenantId, month]).then(r => r.rows);

  const invoice = {
    tenantId,
    month,
    lineItems: costs.map(cost => ({
      verticalId: cost.vertical_id,
      description: `${cost.vertical_id} infrastructure costs`,
      vercel: cost.vercel_cost,
      database: cost.neon_cost + cost.supabase_cost,
      fees: cost.stripe_fees,
      other: cost.other_costs,
      subtotal: cost.total_cost
    })),
    total: costs.reduce((sum, cost) => sum + parseFloat(cost.total_cost), 0)
  };

  // Send to billing system (Stripe, etc.)
  await createStripeInvoice(invoice);

  return invoice;
}
```

---

## Monitoring & Dashboards

### Key Metrics

- **Total monthly cost**: Sum across all tenants
- **Cost per tenant**: Average cost per active tenant
- **Cost by vertical**: Breakdown by vertical
- **Cost by resource type**: Vercel vs Neon vs Supabase
- **Margin per tenant**: Revenue - cost

### Strix Console Dashboard

```typescript
// apps/strix-console/src/app/costs/page.tsx
export default async function CostsPage() {
  const summary = await fetch('/api/console/costs/summary').then(r => r.json());

  return (
    <div>
      <h1>Cost Allocation</h1>
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>Current Month</CardHeader>
          <CardContent>${summary.data.current_month_cost.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>Last Month</CardHeader>
          <CardContent>${summary.data.last_month_cost.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>Active Tenants</CardHeader>
          <CardContent>{summary.data.active_tenants}</CardContent>
        </Card>
        <Card>
          <CardHeader>Avg Cost/Tenant</CardHeader>
          <CardContent>${summary.data.avg_cost_per_tenant.toFixed(2)}</CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Always Tag Resources

Every Pulumi resource must include Strix tags:

```typescript
// ✅ Good
const database = new neon.Database('db', {
  name: 'strix-replyhero-acme-prod',
  tags: strixTags
});

// ❌ Bad (no tags)
const database = new neon.Database('db', {
  name: 'my-database'
});
```

### 2. Review Costs Weekly

Set up weekly cost review meetings to identify trends and anomalies.

### 3. Set Budget Alerts

Configure alerts when tenant costs exceed budget:

```typescript
const budgetThresholds = {
  starter: 100, // $100/month
  growth: 500,
  enterprise: 2000
};

async function checkBudgetExceeded(tenantId: string, plan: string) {
  const currentCost = await getCurrentMonthCost(tenantId);
  const threshold = budgetThresholds[plan];

  if (currentCost > threshold) {
    await sendAlert({
      type: 'budget_exceeded',
      tenantId,
      currentCost,
      threshold
    });
  }
}
```

### 4. Automate Cost Optimization

Run monthly job to identify optimization opportunities:

```bash
# Cron: 1st of every month at 9:00 AM
0 9 1 * * /usr/local/bin/node scripts/cost-optimization.js
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| **Resource Tags** | `strix_tenant_id`, `strix_vertical_id`, `strix_env`, `strix_location_id` |
| **Naming Pattern** | `strix-{vertical}-{tenant}-{env}` |
| **Data Sources** | Vercel, Neon, Supabase, Stripe, Cloud exports |
| **Tables** | `raw_cost_events`, `tenant_monthly_costs` |
| **Aggregation** | Nightly n8n job aggregates raw events by tenant/month |
| **Reporting** | Console API endpoints for tenant/vertical/summary costs |
| **Optimization** | Right-sizing, anomaly detection, budget alerts |

---

## References

- [Strix Platform Architecture](../architecture/STRIX_PLATFORM_ARCHITECTURE.md)
- [Instance Specification Schema](../../schemas/instance-spec.ts)
- [Vercel Usage API](https://vercel.com/docs/rest-api/endpoints/usage)
- [Neon Consumption API](https://neon.tech/docs/reference/api-reference#consumption)
- [Stripe Balance Transactions](https://stripe.com/docs/api/balance_transactions)
