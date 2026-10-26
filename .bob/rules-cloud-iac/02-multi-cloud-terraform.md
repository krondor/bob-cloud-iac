# Multi-Cloud Terraform Standards

Universal Terraform architecture and conventions across AWS, Azure, and GCP.

## 1. Module structure per cloud

Organize infrastructure into reusable capability modules by cloud:

```
modules/
  storage/
    aws/       S3 bucket + S3 event notification + EventBridge rule
    azure/     Storage Account + Blob container + Event Grid subscription
    gcp/       GCS bucket + Eventarc trigger
  messaging/
    aws/       SQS queue + SQS DLQ + redrive policy
    azure/     Service Bus namespace + queue + dead-letter settings
    gcp/       Pub/Sub topic + subscription + dead-letter topic
  compute/
    aws/       Lambda function + IAM role + event source mapping
    azure/     Function App + App Service Plan + Managed Identity
    gcp/       Cloud Run service + Eventarc trigger + Service Account
```

## 2. Provider version pinning

Always pin required Terraform and provider versions explicitly:

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
```

Never use `version = "latest"` or open-ended unpinned constraints.

## 3. Environment separation

Each environment (`dev`, `staging`, `prod`) is a separate root module with independent state:

```
environments/
  dev/
    main.tf          Module calls
    terraform.tfvars Variables for dev
    backend.tf       Remote state backend
  staging/
    ...
  prod/
    ...
```

Production environments must set `prevent_destroy = true` on stateful resources (storage buckets, databases, message queues).

## 4. Resource naming convention

Resources follow `{project}-{environment}-{component}-{resource-type}`. Enforce valid environments via variable validation.
