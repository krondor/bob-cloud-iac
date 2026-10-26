# Security and IAM Standards

Universal security hardening rules for all Terraform code.

## 1. Least-privilege IAM

- IAM policies must grant minimum required actions only (e.g. `s3:GetObject`, `s3:PutObject` rather than `s3:*`).
- Never use wildcard resources (`"Resource": "*"`) for write, update, or delete permissions.
- Always use dedicated execution roles and Managed Identities / Service Accounts per service component.

## 2. Encryption controls

- Explicit Customer Managed Keys (CMK) / customer-managed encryption on all storage buckets, databases, and message queues.
- Enforce TLS in transit via bucket policies / secure transport rules (`aws:SecureTransport: "true"`).
- Explicit key rotation enabled on all KMS keys (`enable_key_rotation = true`).

## 3. Network isolation

- No public ingress endpoints or `0.0.0.0/0` security group ingress rules unless explicitly required by spec.
- Connect serverless compute to private VPC/VNet subnets with private endpoints / PrivateLink for cloud service access.

## 4. Secret hygiene

- Never hardcode passwords, API keys, or tokens in `.tf` or `.tfvars` files.
- Mark all sensitive input variables with `sensitive = true`.
- Fetch credentials dynamically from AWS Secrets Manager, Azure Key Vault, or GCP Secret Manager.
