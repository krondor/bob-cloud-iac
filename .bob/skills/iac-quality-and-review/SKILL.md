---
name: iac-quality-and-review
version: 0.1.0
description: IaC quality checklist, security hardening audit items, CIS benchmark compliance, provider pinning rules, and P0/P1 review finding criteria for Terraform configurations.
when_to_use: Use when reviewing generated Terraform configurations or conducting pre-deployment infrastructure audits in cloud-iac or iac-reviewer mode.
---

# IaC Quality and Review Checklist

Systematic verification framework for reviewing Terraform and cloud infrastructure configurations against enterprise security and operational standards.

## Skill navigation

| Section | Description |
|---|---|
| [Review checklist](#review-checklist) | Category-by-category verification items |
| [P0 blocker criteria](#p0-blocker-criteria) | Non-negotiable security/quality criteria that block deployment |
| [Review findings block format](#review-findings-block-format) | Markdown format for findings handoff |
| [Anti-patterns](#anti-patterns) | High-risk IaC patterns to flag |
| [Grounding sources](#grounding-sources) | Reference links and verification dates |

---

## Review checklist

### 1. Provider & Version Pinning
- [ ] Root modules pin exact or pessimistic (`~>`) provider versions.
- [ ] Required Terraform version pinned (`required_version = ">= 1.6.0"`).
- [ ] No unpinned modules or mutable git references (`ref=main`).

### 2. Security & IAM
- [ ] IAM policies use least-privilege actions with explicit ARNs (no `"Resource": "*"` for write/delete).
- [ ] All sensitive variables have `sensitive = true`.
- [ ] Zero plaintext passwords or API keys in `.tf` or `.tfvars`.
- [ ] Remote state backend has encryption and state locking enabled.

### 3. Encryption & Networking
- [ ] Storage buckets and databases have explicit CMK KMS encryption.
- [ ] Bucket policies enforce TLS/HTTPS in transit.
- [ ] Compute resources reside in private subnets with no direct public IPs.

### 4. Reliability & Maintainability
- [ ] Queues have configured Dead Letter Queues (DLQ) with redrive policies.
- [ ] Stateful resources in prod have `prevent_destroy = true`.
- [ ] Consistent resource naming and required tags (`Environment`, `Project`, `Owner`).

---

## P0 blocker criteria

Mark as **P0** in review findings if any of the following are observed:
1. Plaintext secret or credential in code or variable files.
2. Wildcard IAM write/admin action on wildcard resource (`*`).
3. Unencrypted storage bucket, database, or message queue.
4. Storage bucket or database with unrestricted public access (`0.0.0.0/0`).
5. Missing remote state locking configuration.

---

## Review findings block format

```markdown
### Review findings: <spec-id> / <module-name>

| Severity | Category | File & Line | Finding | Remediation |
|---|---|---|---|---|
| **[P0]** | Security | `modules/storage/aws/main.tf:12` | Missing KMS CMK encryption on S3 bucket | Add `aws_s3_bucket_server_side_encryption_configuration` with KMS key ARN |
| **[P1]** | Reliability | `modules/messaging/aws/main.tf:35` | SQS queue lacks dead-letter queue | Configure `redrive_policy` pointing to DLQ |

**Open decisions / follow-ups:**
1. [P0] ...
```

---

## Anti-patterns

- **Broad CIDR Ingress:** Allowing `0.0.0.0/0` on port 22 (SSH) or 3389 (RDP).
- **Missing State Locking:** Using remote backend without DynamoDB or blob leasing allows concurrent conflicting state modifications.
- **Unversioned Modules:** Sourcing external modules without a pinned release tag.

---

## Grounding sources

- [Terraform Best Practices](https://www.terraform-best-practices.com/) — verified: 2026-03-30
- [OpenTofu Documentation](https://opentofu.org/docs/) — verified: 2026-03-30
- [Bridgecrew Checkov Policies](https://www.checkov.io/) — verified: 2026-03-30
