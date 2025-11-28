# Kratix Optionality – Platform Upgrade Path

**Status:** Architecture Specification v1.0
**Last Updated:** 2025-11-28

---

## Overview

**Kratix requires Kubernetes and is NOT required for Strix MVP.**

Strix is designed to support two orchestration modes, allowing operators to choose the complexity level appropriate for their scale and operational maturity.

---

## Orchestration Modes

### Mode A — MVP: Pulumi-Only Orchestration

**No Kubernetes Required**

In MVP mode, Strix uses Pulumi directly for all infrastructure provisioning and deployment orchestration. This mode is suitable for:

- Initial platform deployment
- Single-operator teams
- Low-to-medium instance counts (< 50 instances)
- Simplified operational overhead
- Development and staging environments

**Architecture:**

```
┌──────────────────────────────────────────────┐
│  STRIX CONTROL PLANE (Console + Engine)     │
│  • Console UI                                │
│  • Vertical Registry                         │
│  • Generator/Validator CLI                   │
└─────────────────┬────────────────────────────┘
                  │
                  │ Direct API Calls
                  ▼
┌──────────────────────────────────────────────┐
│  PULUMI ORCHESTRATION                        │
│  • Stack Management                          │
│  • Resource Provisioning                     │
│  • State Management                          │
└─────────────────┬────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│  INFRASTRUCTURE PROVIDERS                    │
│  • Neon Postgres                             │
│  • Vercel                                    │
│  • Cloud Resources                           │
└──────────────────────────────────────────────┘
```

**Provisioning Flow:**

1. Operator requests new instance via Console
2. Control Plane creates instance specification
3. Control Plane directly invokes Pulumi CLI/API
4. Pulumi provisions resources
5. Outputs returned to Control Plane
6. Instance registered and marked active

**Implementation:**

```typescript
// Control Plane directly calls Pulumi
async function provisionInstance(spec: InstanceSpec) {
  const pulumi = new PulumiStack({
    verticalId: spec.verticalId,
    tenantId: spec.tenantId,
    environment: spec.environment,
    locationId: spec.locationId
  });

  const outputs = await pulumi.up();

  await registry.registerInstance({
    ...spec,
    deploymentUrl: outputs.appUrl,
    apiBaseUrl: outputs.apiBaseUrl,
    databaseUrl: outputs.databaseUrl,
    status: 'active'
  });
}
```

**Advantages:**
- ✅ Minimal infrastructure dependencies
- ✅ Simple operational model
- ✅ Fast time-to-value
- ✅ Lower learning curve
- ✅ Direct debugging of Pulumi stacks

**Limitations:**
- ❌ No declarative desired-state reconciliation
- ❌ Manual orchestration of complex workflows
- ❌ Limited multi-stage pipeline support
- ❌ No built-in GitOps integration

---

### Mode B — Scale: Kratix + Kubernetes Hybrid

**Kubernetes Required**

In Scale mode, Strix adds Kratix as an orchestration layer on top of Pulumi. This mode is suitable for:

- Production multi-tenant platforms
- Teams with Kubernetes expertise
- High instance counts (> 50 instances)
- Complex deployment workflows
- GitOps-driven operations
- Advanced automation requirements

**Architecture:**

```
┌──────────────────────────────────────────────┐
│  STRIX CONTROL PLANE (Console + Engine)     │
│  • Console UI                                │
│  • Vertical Registry                         │
│  • Generator/Validator CLI                   │
└─────────────────┬────────────────────────────┘
                  │
                  │ Submits Kratix Resources
                  ▼
┌──────────────────────────────────────────────┐
│  KRATIX ORCHESTRATOR (on Kubernetes)        │
│  • Promises (SaaS Vertical)                  │
│  • Resource Reconciliation                   │
│  • Workflow Execution                        │
│  • State Management                          │
└─────────────────┬────────────────────────────┘
                  │
                  │ Workflow Jobs invoke Pulumi
                  ▼
┌──────────────────────────────────────────────┐
│  PULUMI ORCHESTRATION                        │
│  • Stack Management                          │
│  • Resource Provisioning                     │
│  • State Management                          │
└─────────────────┬────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│  INFRASTRUCTURE PROVIDERS                    │
│  • Neon Postgres                             │
│  • Vercel                                    │
│  • Cloud Resources                           │
└──────────────────────────────────────────────┘
```

**Provisioning Flow:**

1. Operator requests new instance via Console
2. Control Plane creates Kratix Resource (YAML)
3. Resource submitted to Kubernetes API
4. Kratix matches Resource to Promise
5. Kratix executes workflows (configure, provision, deploy, monitor)
6. Workflows invoke Pulumi with parameters
7. Pulumi provisions infrastructure
8. Kratix updates Resource status
9. Control Plane polls/watches Resource status
10. Instance marked active when workflows complete

**Implementation:**

```typescript
// Control Plane submits Kratix Resource
async function provisionInstance(spec: InstanceSpec) {
  const resource = {
    apiVersion: 'strix.platform/v1alpha1',
    kind: 'SaasVertical',
    metadata: {
      name: `${spec.verticalId}-${spec.tenantId}`,
      namespace: 'strix-instances'
    },
    spec: {
      verticalId: spec.verticalId,
      tenantId: spec.tenantId,
      environment: spec.environment,
      locationId: spec.locationId,
      version: spec.version,
      plan: spec.plan
    }
  };

  await k8sClient.create(resource);

  // Watch for completion
  await k8sClient.watch(resource, (event) => {
    if (event.status.phase === 'Ready') {
      registry.registerInstance({
        ...spec,
        deploymentUrl: event.status.outputs.appUrl,
        apiBaseUrl: event.status.outputs.apiBaseUrl,
        databaseUrl: event.status.outputs.databaseUrl,
        status: 'active'
      });
    }
  });
}
```

**Advantages:**
- ✅ Declarative desired-state reconciliation
- ✅ Multi-stage workflow orchestration
- ✅ GitOps integration via Flux/ArgoCD
- ✅ Self-healing via Kubernetes controllers
- ✅ Auditable via Kubernetes events
- ✅ Multi-cluster support

**Limitations:**
- ❌ Requires Kubernetes cluster
- ❌ Higher operational complexity
- ❌ Steeper learning curve
- ❌ Additional infrastructure overhead

---

## Mode Selection

### Control Plane Configuration

The orchestration mode is configured via the Control Plane configuration file or environment variable:

```yaml
# strix-config.yaml
orchestrator:
  mode: "pulumi-only"  # or "kratix"

  pulumi:
    backend: "s3"  # or "local", "azureblob", etc.
    stateUrl: "s3://strix-pulumi-state"

  kratix:
    enabled: false
    kubernetesContext: "strix-platform"
    namespace: "strix-kratix"
    promiseRegistry: "platform/kratix/promises"
```

**Environment Variable:**

```bash
STRIX_ORCHESTRATOR_MODE=pulumi-only  # or kratix
```

### Instance Specification

The `orchestrator_mode` field is added to instance specifications to track which mode was used for provisioning:

```typescript
interface InstanceSpec {
  instanceId: string;
  verticalId: string;
  tenantId: string;
  environment: 'dev' | 'staging' | 'prod';
  locationId: string;
  orchestratorMode: 'pulumi-only' | 'kratix';
  // ... other fields
}
```

---

## Migration Path

### From Pulumi-Only to Kratix

When an organization outgrows Mode A and needs Mode B capabilities:

**Prerequisites:**
1. Kubernetes cluster provisioned
2. Kratix installed and configured
3. Promises deployed to cluster
4. Control Plane updated with Kratix configuration

**Migration Steps:**

1. **Enable Dual Mode** (temporary):
   ```yaml
   orchestrator:
     mode: "hybrid"  # Support both modes
   ```

2. **Create Kratix Resources for existing instances:**
   ```bash
   npm run scripts:migrate-to-kratix
   ```

   This script:
   - Reads existing instance registry
   - Generates Kratix Resources for each instance
   - Submits resources to Kubernetes (without re-provisioning)
   - Updates `orchestratorMode` field to `kratix`

3. **Verify Kratix Adoption:**
   ```bash
   kubectl get saasverticals -n strix-instances
   ```

4. **Switch to Kratix-Only Mode:**
   ```yaml
   orchestrator:
     mode: "kratix"
   ```

5. **New provisions use Kratix workflow**

**Rollback:**
- If issues arise, revert to `pulumi-only` mode
- Existing instances continue to function
- New provisions use Pulumi directly

---

## Versioning Strategy

### Promise Versions

Kratix Promises are versioned independently from Strix platform versions:

- `v1alpha1` – Initial Promise API (current)
- `v1beta1` – Stabilized API (future)
- `v1` – Production-ready API

### Backward Compatibility

- Mode A (Pulumi-only) remains supported indefinitely
- Mode B (Kratix) is additive, not replacement
- Existing instances are not affected by mode changes
- New platform features may be Kratix-only (documented clearly)

---

## Decision Tree

```
START: Deploy Strix
  │
  ├─ Do you have Kubernetes expertise? ──NO──> Mode A (Pulumi-Only)
  │                                              │
  │                                              └─> Deploy, iterate, grow
  │                                                  │
  │                                                  └─> Outgrow Mode A? ──YES──> Migrate to Mode B
  │
  └─ YES
     │
     ├─ Do you need GitOps? ──YES──> Mode B (Kratix)
     │
     ├─ Do you need > 50 instances? ──YES──> Mode B (Kratix)
     │
     ├─ Do you need complex workflows? ──YES──> Mode B (Kratix)
     │
     └─ Otherwise ──> Mode A (Pulumi-Only)
```

---

## Summary

| Feature | Pulumi-Only | Kratix |
|---------|-------------|--------|
| **Kubernetes Required** | ❌ No | ✅ Yes |
| **Complexity** | Low | Medium-High |
| **Time-to-Value** | Fast | Moderate |
| **Declarative Workflows** | ❌ No | ✅ Yes |
| **GitOps** | Manual | ✅ Native |
| **Self-Healing** | Manual | ✅ Automatic |
| **Multi-Cluster** | Manual | ✅ Built-in |
| **Suitable For** | MVP, < 50 instances | Production, > 50 instances |

**Recommendation:** Start with Pulumi-Only (Mode A) for MVP. Migrate to Kratix (Mode B) when operational scale demands it.

---

## References

- [Strix Platform Architecture](../architecture/STRIX_PLATFORM_ARCHITECTURE.md)
- [Pulumi Stack Patterns](../../infrastructure/pulumi/README.md)
- [Kratix Promise Definitions](../../platform/kratix/promises/README.md)
- [Instance Specification Schema](../../schemas/instance-spec.ts)
