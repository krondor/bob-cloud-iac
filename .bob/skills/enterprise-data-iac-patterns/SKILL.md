---
name: enterprise-data-iac-patterns
version: 0.1.0
description: Terraform configurations for enterprise data integrations including Snowflake storage integrations, Databricks external locations, BigQuery datasets, Kafka, and data lake storage roles.
when_to_use: Use when generating Terraform resources connecting cloud infrastructure to Snowflake, Databricks, BigQuery, Kafka, or external analytical platforms.
---

# Enterprise Data IaC Patterns

Terraform resources, trust policies, and connectivity definitions for enterprise analytics and data platforms.

## Skill navigation

| Section | Description |
|---|---|
| [Snowflake integration patterns](#snowflake-integration-patterns) | Storage integrations, external stages, IAM trust |
| [Databricks integration patterns](#databricks-integration-patterns) | Unity Catalog storage credentials, external locations |
| [BigQuery & streaming analytics](#bigquery--streaming-analytics) | Dataset definitions, authorized views, Pub/Sub subscriptions |
| [Anti-patterns](#anti-patterns) | Common data platform IaC mistakes |
| [Grounding sources](#grounding-sources) | Reference links and verification dates |

---

## Snowflake integration patterns

### AWS IAM Trust for Snowflake Storage Integration
```hcl
data "aws_iam_policy_document" "snowflake_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "AWS"
      identifiers = [var.snowflake_storage_aws_iam_user_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = [var.snowflake_storage_aws_external_id]
    }
  }
}

resource "aws_iam_role" "snowflake_storage" {
  name               = "${var.project}-${var.environment}-snowflake-storage-role"
  assume_role_policy = data.aws_iam_policy_document.snowflake_trust.json
}
```

---

## Databricks integration patterns

- Configure Unity Catalog storage credentials with dedicated cross-account IAM roles or Azure Managed Identities.
- Define external locations in Terraform pointing to specific S3/ADLS/GCS URI prefixes.

---

## BigQuery & streaming analytics

- Configure `google_bigquery_dataset` with explicit KMS encryption (`default_encryption_configuration`).
- Bind Pub/Sub BigQuery subscriptions (`google_pubsub_subscription` with `bigquery_config`) for direct streaming ingest.

---

## Anti-patterns

- **Missing External ID in IAM Trust:** Omitting `sts:ExternalId` in cross-account role assumption creates Confused Deputy vulnerabilities.
- **Overly Broad External Stage Prefix:** Pointing Snowflake or Databricks external stage at the root of a storage bucket instead of a dedicated folder prefix.

---

## Grounding sources

- [Snowflake Terraform Provider](https://registry.terraform.io/providers/Snowflake-Labs/snowflake/latest/docs) — verified: 2026-03-30
- [Databricks Terraform Provider](https://registry.terraform.io/providers/databricks/databricks/latest/docs) — verified: 2026-03-30
- [Google BigQuery Terraform Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset) — verified: 2026-03-30
