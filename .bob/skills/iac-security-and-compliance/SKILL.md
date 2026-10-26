---
name: iac-security-and-compliance
version: 0.1.0
description: Security hardening controls, CIS cloud benchmark alignments, tfsec/checkov compliance checklists, private networking patterns, and least-privilege IAM policies in Terraform.
when_to_use: Use when generating security-sensitive Terraform resources including IAM policies, KMS keys, security groups, private endpoints, or preparing for security audits.
---

# IaC Security and Compliance

Security controls, policy-as-code requirements, and compliance checklists for multi-cloud Terraform.

## Skill navigation

| Section | Description |
|---|---|
| [Least-privilege IAM patterns](#least-privilege-iam-patterns) | Scoped action policies and trust relationships |
| [Encryption & KMS policies](#encryption--kms-policies) | Key policies, rotation, and cryptographic boundaries |
| [Network isolation & private endpoints](#network-isolation--private-endpoints) | VPC endpoints, Private Link, Private Service Connect |
| [Anti-patterns](#anti-patterns) | High-severity security issues to eliminate |
| [Grounding sources](#grounding-sources) | Reference links and verification dates |

---

## Least-privilege IAM patterns

### Scoped AWS IAM Policy Example
```hcl
data "aws_iam_policy_document" "lambda_sqs_processor" {
  statement {
    sid    = "ReadQueueMessages"
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [var.sqs_queue_arn]
  }

  statement {
    sid    = "DecryptQueuePayload"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey"
    ]
    resources = [var.kms_key_arn]
  }
}
```

---

## Encryption & KMS policies

- Always enable `enable_key_rotation = true` on AWS KMS / Azure Key Vault / GCP KMS.
- Define explicit key administrator vs key user separation in key policies.
- Enforce SSL/TLS 1.2+ for all object storage endpoints and API gateways.

---

## Network isolation & private endpoints

- **AWS:** `aws_vpc_endpoint` for S3, SQS, Secrets Manager, and KMS.
- **Azure:** `azurerm_private_endpoint` for Storage, Key Vault, and Service Bus with private DNS zones.
- **GCP:** Private Service Connect (PSC) and VPC Service Controls perimeters.

---

## Anti-patterns

- **Broad IAM Actions:** Using `s3:*` or `sqs:*` grants admin privileges to runtime workers.
- **Wildcard Resources:** Assigning `"Resource": "*"` allows cross-tenant or unintended resource access.
- **Public IP Assignment:** `associate_public_ip_address = true` on compute instances without bastion/NAT controls.

---

## Grounding sources

- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services) — verified: 2026-03-30
- [CIS Microsoft Azure Foundations Benchmark](https://www.cisecurity.org/benchmark/azure) — verified: 2026-03-30
- [CIS Google Cloud Platform Foundation Benchmark](https://www.cisecurity.org/benchmark/google_cloud_computing_platform) — verified: 2026-03-30
- [tfsec Rules Reference](https://aquasecurity.github.io/tfsec/latest/) — verified: 2026-03-30
