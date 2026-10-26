---
name: terraform-multi-cloud-patterns
version: 0.1.0
description: Reference module architectures for AWS, Azure, and GCP in Terraform, covering storage, messaging, serverless compute, remote state backends, provider configurations, and tagging standards.
when_to_use: Use when structuring multi-cloud Terraform modules, configuring remote state backends, defining provider blocks, or generating cloud resource patterns.
---

# Terraform Multi-Cloud Patterns

Standard module architectures and provider conventions for AWS, Azure, and GCP Terraform configurations.

## Skill navigation

| Section | Description |
|---|---|
| [Storage and messaging patterns](#storage-and-messaging-patterns) | S3/SQS, Azure Blob/Service Bus, GCS/PubSub |
| [Serverless compute patterns](#serverless-compute-patterns) | Lambda, Function Apps, Cloud Run |
| [Remote state backend patterns](#remote-state-backend-patterns) | S3+DynamoDB, Azure Blob, GCS state locking |
| [Anti-patterns](#anti-patterns) | Common IaC architecture errors |
| [Grounding sources](#grounding-sources) | Reference links and verification dates |

---

## Storage and messaging patterns

### AWS S3 + SQS Pattern
```hcl
resource "aws_s3_bucket" "data" {
  bucket        = "${var.project}-${var.environment}-data-bucket"
  force_destroy = false
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project}-${var.environment}-dlq"
  message_retention_seconds = 1209600
  kms_master_key_id         = var.kms_key_arn
}

resource "aws_sqs_queue" "main" {
  name                      = "${var.project}-${var.environment}-queue"
  kms_master_key_id         = var.kms_key_arn
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}
```

### Azure & GCP mappings
- **Azure:** `azurerm_storage_account` with `customer_managed_key` + `azurerm_servicebus_queue` with `dead_lettering_on_message_expiration = true`.
- **GCP:** `google_storage_bucket` with `encryption` (KMS key name) + `google_pubsub_topic` with `dead_letter_policy`.

---

## Remote state backend patterns

- **AWS:** S3 bucket + DynamoDB table for state locking (`aws_dynamodb_table` with `LockID` hash key).
- **Azure:** Azure Blob container with blob lease locking.
- **GCP:** GCS bucket with object generation locking.

---

## Anti-patterns

- **Hardcoded ARNs or IDs:** Hardcoding subscription IDs or accounts breaks environment portability.
- **Missing DLQ configuration:** Creating messaging queues without dead-letter queues drops unprocessable messages.
- **Monolithic main.tf:** Placing all resources in a single flat file rather than composable capability modules.

---

## Grounding sources

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs) — verified: 2026-03-30
- [Terraform AzureRM Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs) — verified: 2026-03-30
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs) — verified: 2026-03-30
