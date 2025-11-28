# 🦉 Strix Platform – Core Architecture (v1.0)

_This document defines Strix as a **deployment & orchestration platform**, not a code generator._

---

## 0. Strix Platform Architecture

### 0.1 Mental Model

Strix is a **multi-vertical SaaS platform** that can:

- Register verticals (ReplyHero, PTO Manager, etc.)
- Provision new tenant instances on demand
- Manage infrastructure & deployments
- Monitor health and auto-heal issues
- Provide a unified console for operators

Strix is composed of **four layers**:

1. **Control Plane (Engine + Console)**
2. **Orchestrator Layer (Kratix)**
3. **Infrastructure Layer (Pulumi + providers)**
4. **Vertical Runtime Layer (individual products)**

```
┌──────────────────────────────────────────────────────────┐
│  STRIX CONTROL PLANE                                    │
│  • Console (UI)    • Registry    • Generator • Validator │
└───────────────▲───────────────────────────────▲─────────┘
                │                               │
┌───────────────┴───────────────────────────────┴─────────┐
│  ORCHESTRATOR LAYER – KRATIX                            │
│  • Promises  • Workflows  • Desired vs Actual State     │
└───────────────▲───────────────────────────────▲─────────┘
                │                               │
┌───────────────┴───────────────────────────────┴─────────┐
│  INFRASTRUCTURE LAYER – PULUMI + PROVIDERS             │
│  • Neon Postgres  • Vercel  • Other Cloud Resources     │
└───────────────▲───────────────────────────────▲─────────┘
                │                               │
┌───────────────┴───────────────────────────────┴─────────┐
│  VERTICAL RUNTIME LAYER                                 │
│  • ReplyHero   • Future Vertical X   • …                │
└──────────────────────────────────────────────────────────┘
```

Key shift:

- ❌ Strix is not just a code scaffolder.
- ✅ Strix is a control plane + orchestrator that manages verticals as workloads.

---

## 1. Control Plane (Console + Engine)

The Control Plane is everything that runs inside the strix-platform monorepo and presents a single pane of glass.

### 1.1 Components

- **Strix Console (UI)**
  - Next.js app at `apps/strix-console`
  - Used by internal operators
  - Shows verticals, tenants, instances, health & telemetry, orchestrator state
- **Vertical Registry**
  - Source of truth for registered verticals
  - Backed by `verticals/<vertical_slug>/manifest.json` and optional DB tables for runtime queries
  - Each manifest references repos (backend/mobile), Kratix Promise, Pulumi stack, endpoints, and monitoring
- **Generator (CLI)**
  - Script: `scripts/create-vertical.js`
  - Creates a new vertical from the Core Template: backend repo skeleton, mobile app skeleton, Vertical Manifest, Kratix Promise declaration, Pulumi stack scaffolding
- **Validator (CLI)**
  - Script: `scripts/validate-vertical.js`
  - Validates a vertical against Strix contracts: structure & required files, API endpoints & response format, Prisma schema requirements, manifest validity, Kratix Promise consistency, Pulumi readiness
- **API / Service Layer**
  - Internal APIs used by the Console: `/api/console/dashboard/*`, `/api/console/verticals/*`, `/api/console/tenants/*`, `/api/console/instances/*`
  - These endpoints read/write registry data, orchestrator state, telemetry, and audit logs

### 1.2 Monorepo Sketch

Conceptual layout (exact paths can evolve, but this is the mental map):

```
/strix-platform
  /apps
    /strix-console          # Control plane UI
  /templates
    /saas-vertical-mobile   # Core template (backend + mobile)
  /verticals
    /replyhero
      manifest.json
      # future: resource.yaml, runbooks, docs links
  /platform
    /kratix                 # Promises & workflows
  /infrastructure
    /pulumi                 # Stacks for verticals
  /scripts
    create-vertical.js
    validate-vertical.js
    validate-manifest.js
```

---

## 2. Orchestrator Layer – Kratix (Optional)

**Note:** Kratix is **optional** and requires Kubernetes. For MVP deployments, Strix supports Pulumi-only orchestration. See [Kratix Optionality](../platform/kratix-optional.md) for mode selection guidance.

The Orchestrator Layer is responsible for turning desired state into running systems.

### 2.1 Concepts

- **Promise**: reusable Kratix abstraction that defines what a "SaaS vertical" workload looks like, required parameters (vertical id, repos, env, plan, etc.), and what workflows run on create/update/delete.
- **Resource**: a concrete instance of a Promise (e.g., "ReplyHero vertical definition", "ReplyHero instance for Tenant X").
- **Workflows**: Kubernetes Jobs run by Kratix that call Pulumi to provision infrastructure, configure monitoring, and register events and telemetry.

### 2.2 SaaS Vertical Promise

Strix defines a generic Promise for "SaaS Vertical + Mobile", e.g. `promises/saas-vertical-mobile/promise.yaml`.

This Promise:

- Accepts a Vertical Manifest reference
- Ensures a database exists, a backend deployment exists, monitoring is wired, and telemetry is registered

### 2.3 Control Plane → Kratix Flow

1. Operator selects vertical (e.g., replyhero), tenant (e.g., Acme Plumbing), and plan (e.g., growth).
2. Strix Console creates a Vertical Instance Spec (desired state), persists it, and submits a Kratix SaaSVertical resource.
3. Kratix matches SaaSVertical to the saas-vertical-mobile Promise and executes configured workflows (configure, provision, deploy, monitor).
4. Workflows call the appropriate Pulumi stack and feed in params from the Manifest & Instance Spec.
5. Kratix surfaces status back to Console (via Kubernetes CR status, events, etc.).

---

## 3. Infrastructure Layer – Pulumi + Providers

The Infrastructure Layer is where real resources are created:

- Databases (Neon Postgres)
- Deployments (Vercel)
- Buckets, queues, monitoring, etc.

### 3.1 Pulumi as Infra Contract

Each vertical’s infra is modeled as a Pulumi program that:

- Takes config from the Vertical Manifest and Instance Spec
- Produces outputs: `database_url`, `api_base_url`, `app_url`, `health_url`
- Exports these to Kratix workflows, Strix Console (for display), and Jason (for monitoring & runbooks)

Example stack pattern:

```ts
// infrastructure/pulumi/replyhero/index.ts
export const appUrl = pulumi.interpolate`https://${stackDomain}`;
export const apiBaseUrl = pulumi.interpolate`${appUrl}/api`;
export const databaseUrl = database.connectionString;
```

### 3.2 Provider Strategy

Initial default:

- Database: Neon Postgres
- Hosting: Vercel (Next.js)
- Monitoring: 3rd-party uptime provider (or custom)

This remains provider-pluggable:

- Templates & manifests must not hard-code a particular cloud
- Pulumi stacks encapsulate provider details

### 3.3 Environments

Each instance supports multiple environments:

- dev – for development/testing
- staging – pre-production
- prod – customer-facing

Pulumi stacks are named accordingly (e.g., `replyhero-dev`, `replyhero-staging`, `replyhero-prod`, or per-tenant: `replyhero-acme-prod`).

---

## 4. Vertical Runtime Layer

This is the actual product running for a tenant.

### 4.1 Definitions

- **Vertical**: fully defined product template with backend (Next.js + Prisma), mobile app (Expo), domain entity model (e.g., Review), API contract, Prisma schema extensions, and AI workflows.
- **Tenant**: customer using one or more verticals, potentially across multiple environments (dev, prod) and locations.
- **Instance**: concrete deployment of a vertical for a tenant & environment, identified by `vertical_id`, `tenant_id`, `environment`, and `location_id`. See [Multi-Region Strategy](../infra/location-strategy.md) for location identifier format and usage.

### 4.2 Example: ReplyHero as a Vertical

- Primary entity: review
- Core workflows: fetch reviews, generate AI draft, approve & post reply
- API: `/api/mobile/session`, `/api/mobile/reviews`, `/api/mobile/reviews/[id]`, `/api/mobile/reviews/[id]/draft`, `/api/mobile/reviews/[id]/reply`
- DB: `Review`, `ReviewDraft`, `ReviewReply` plus core Strix tables

---

## 5. Vertical Lifecycle

The Vertical Lifecycle is the heartbeat of Strix.

### 5.1 Lifecycle Stages

1. **Design**: use template to define backend/mobile/AI behavior, write Prisma schema extensions, define API contract.
2. **Register**: create `verticals/<slug>/manifest.json`; optionally register in DB/registry service; link to repos, Promise, Pulumi stack, docs, runbooks.
3. **Provision**: operator or API request ("Create ReplyHero instance for Tenant X"); Control Plane creates instance spec and submits Kratix resource (or calls Pulumi directly); Kratix runs workflows and calls Pulumi (or Pulumi invoked directly); Pulumi provisions DB, deployments, env vars. See [Secret Management](../security/secret-management.md) for credential handling.
4. **Operate**: instances run and serve traffic; monitoring + telemetry feed Jason; Console shows health, usage, MRR (future), error rates. See [Cost Allocation](../billing/cost-allocation.md) for infrastructure cost tracking.
5. **Upgrade**: vertical version bump (v1.0.0 → v1.1.0); migrations applied via Pulumi + app deploy; orchestrated by new Promise version and new stack configuration. See [Prisma Migration Model](../database/prisma-migration-model.md) for schema evolution strategy.
6. **Suspend / Deprovision**: disable endpoints / block logins; archive data (as policy requires); tear down infra if needed.

### 5.2 Lifecycle Diagram

```
Design → Register → Provision → Operate → Upgrade → Deprovision
   ↑                                                    │
   └─────────────────────── Feedback Loop ──────────────┘
```

---

## 6. Strix Contracts

To be a first-class Strix vertical, a product must conform to several contracts.

### 6.1 Vertical Manifest Contract

File: `verticals/<slug>/manifest.json`

High-level fields:

- `id` – machine slug (replyhero)
- `name` – human name
- `version` – semantic version
- `status` – development | staging | production | deprecated
- `category` – e.g. customer-success
- `repositories` – backend Git URL, mobile Git URL
- `deployment` – platform (e.g., vercel), `kratix_promise` name, `pulumi_stack` base name
- `endpoints` – api, health, docs
- `integrations` – required / optional integrations
- `telemetry` – events & metrics
- `monitoring` – SLA & alerts
- `pricing` – optional (for console UI)
- `compliance` – optional
- `team` – owner & maintainers
- `documentation` – links to architecture, API, runbooks

Used by the registry, Console UI, Kratix workflows (via env or config), and Jason monitoring setup.

### 6.2 Kratix Promise Contract

Every vertical of type “SaaS Vertical + Mobile” must bind to `promises/saas-vertical-mobile/promise.yaml`.

This Promise defines:

- Required parameters: `vertical_id`, `version`, `environment`, possibly `tenant_id`, `plan`
- Workflow sequence: configure-vertical, provision-database, deploy-backend, setup-monitoring, register-events
- Delete behavior: archive-data, cleanup-resources

### 6.3 Pulumi Stack Contract

A Strix-compliant Pulumi stack must:

- Accept inputs: `verticalId`, `githubRepo`, `environment`, possibly `tenantSlug` or `instanceId`
- Export outputs: `deploymentUrl` (app URL), `apiBaseUrl`, `databaseUrl`, `healthUrl` (optional), any monitoring IDs needed

These outputs are stored in Strix and read by the Console (for UI links), Jason (for health checks), and other automations.

### 6.4 Runtime API Contract (Backend)

Every vertical’s backend must implement at least:

- `GET /api/health` → returns status, version, mode (demo / prod)
- `GET /api/mobile/session` → returns user, organization, feature flags / demo mode status
- `GET /api/mobile/<entity_plural>` → list endpoint with pagination & filters
- `GET /api/mobile/<entity_plural>/[id]` → detail endpoint
- `POST /api/mobile/<entity_plural>/[id]/draft` → AI draft generation
- `POST /api/mobile/<entity_plural>/[id]/action` → domain-specific action (reply, send, etc.)

Common response wrapper:

```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... },
  "message": "optional"
}
```

Errors:

```json
{
  "success": false,
  "error": "Human readable",
  "code": "ERROR_CODE"
}
```

### 6.5 Data Model Contract (Database)

Core tables that must exist (names can be mapped, but semantics are fixed):

- User
- Organization
- Membership (user ↔ org)
- Integration
- AuditLog

Domain layer:

- **Entity** (e.g. Review)
- **EntityDraft** (e.g. ReviewDraft)
- **EntityAction** (e.g. ReviewReply)

Each domain table must include `id`, `createdAt`, `updatedAt`, `organizationId` (multi-tenant) and have indices on `organizationId`, `status` (if applicable), and `createdAt`.

---

## 7. Demo Mode vs Production Mode

All verticals must support:

- **Demo Mode**: uses synthetic or seeded data; no external side effects; visible indicators (“Demo mode” in UI); ideal for sales/testing/internal use.
- **Production Mode**: uses real DB & integrations; connected to actual external APIs.

Demo vs prod is controlled via env vars (`DEMO_MODE=true/false`), health response (`mode: "demo" | "prod"`), and config mapping (demo stacks vs production stacks in Pulumi).

---

## 8. ReplyHero’s Role in Strix

ReplyHero is not the whole platform; it is the first vertical to be onboarded.

Correct sequence:

1. Define Strix architecture (this document)
2. Define template & contracts
3. Retrofit ReplyHero into this model: add manifest, add Pulumi stack, bind to universal Promise
4. Use ReplyHero as example vertical, template reference, and first real deployment under Strix

ReplyHero’s existing code is used to extract patterns, validate template design, and aid testing of generator & validator.

---

## 9. Jason’s Role (Automation Layer)

Jason sits above the core platform as an automation and operations agent.

Jason consumes health endpoints from manifests, telemetry events from verticals, and logs & metrics from monitoring.

Jason can run runbooks when health checks fail, error rates spike, or SLAs are broken, and can recommend scaling, configuration changes, and incident priorities.

Examples:

- When `/api/health` fails: Jason fetches logs & metrics, diagnoses issue with AI, attempts auto-remediation (restart app, rotate keys, toggle flags), and escalates if needed.

Jason is not required for basic Strix operation, but the architecture is designed so that health checks, metrics, and manifests are all structured and machine-readable for Jason to act on.

---

## 10. Evolution & Versioning

- Template versions: v1.x (current), v2.x (future breaking changes)
- Vertical versions: semantic version per product
- Promise versions: via Kratix API versions
- Pulumi stacks: pinned to vertical + env

Rules:

- Within template v1.x: no breaking API changes; additive changes only
- When moving to v2: provide migration guides; support old and new until deprecation window ends

---

## 11. Summary: What Strix Is

- ✅ A control plane for SaaS verticals
- ✅ An orchestrator that uses Kratix Promises, Pulumi stacks, and vertical manifests
- ✅ A template system that standardizes backend + mobile patterns and enforces contracts
- ✅ A platform that provisions, monitors, heals, and evolves verticals over time
- ❌ It is not just a boilerplate generator.
- ❌ It is not a single product (ReplyHero).
- ❌ It is not bound to a single cloud vendor.

Strix’s job is to make “New Customer → New Instance” a standardized, orchestrated, observable operation across every vertical you create.

**Architecture Extensions:**

- [Kratix Optionality](../platform/kratix-optional.md) – Pulumi-only vs Kratix orchestration modes
- [Multi-Region Strategy](../infra/location-strategy.md) – Location ID format, routing, data residency
- [Prisma Migration Model](../database/prisma-migration-model.md) – Schema evolution & rollout strategies
- [Secret Management](../security/secret-management.md) – Credential storage & rotation
- [Cost Allocation Framework](../billing/cost-allocation.md) – Infrastructure cost tracking & tenant billing

**Template & Implementation Docs:**

- `templates/saas-vertical-mobile/ARCHITECTURE.md` (template-focused)
- `templates/saas-vertical-mobile/DECISIONS.md` (ADRs)
- `templates/saas-vertical-mobile/PATTERNS.md` (code patterns)
- `verticals/replyhero/manifest.json` (first vertical)
- `platform/kratix/...` (promises & workflows)
- `infrastructure/pulumi/...` (stacks)
