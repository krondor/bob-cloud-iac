# plan.md

## Infrastructure approach

<!-- High-level design for implementing the Terraform configurations:
     - Module hierarchy and reusable component design
     - Provider versions and required plugins
     - Remote state backend strategy
     - Security and IAM role architecture -->

## Module breakdown

| Capability | Module path | Cloud(s) | Description |
|---|---|---|---|
| Storage | `modules/storage/aws/` | AWS | S3 bucket with CMK encryption and bucket policies |
| Messaging | `modules/messaging/aws/` | AWS | SQS queue with DLQ redrive policy |
| Compute | `modules/compute/aws/` | AWS | Lambda execution role and event source mapping |

## Environment strategy

<!-- State separation for dev, staging, prod and variable management -->

## Open decisions

| # | Decision | Options | Recommended | Status |
|---|---|---|---|---|
| 1 | <!-- Decision topic --> | <!-- A vs B --> | <!-- Choice --> | open |
