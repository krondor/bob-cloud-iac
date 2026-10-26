# spec.md

**Spec ID:** <!-- e.g. 001-multi-cloud-infrastructure -->
**Mode:** cloud-iac
**Status:** draft
**Requirements approval:** pending
**Profile:** none
**Created:** <!-- YYYY-MM-DD -->
**Author:** <!-- name -->

---

## Business problem

<!-- What infrastructure components or environments are being provisioned in this spec?
     Reference the approved architecture document or component-matrix.md.
     Describe what cloud resources must be created. -->

---

## Scope

**In scope:**
<!-- List the Terraform modules and environments this spec covers.
     Example: storage, messaging (SQS/PubSub), serverless compute, IAM roles, KMS keys,
     networking endpoints, monitoring alarms. -->

**Out of scope:**
<!-- List what is explicitly excluded.
     Examples: Application source code (cloud-codegen), test execution suites (cloud-testing),
     architecture decisions (cloud-architect), live deployment execution (terraform apply). -->

---

## Target cloud(s)

<!-- Specify: AWS / Azure / GCP (or multi-cloud combination) -->

---

## Architecture inputs

<!-- List the architecture artifacts this spec depends on.
     Examples: docs/<spec-id>/component-matrix.md, security design, networking layout. -->

---

## Constraints

<!-- List hard constraints on the generated Terraform.
     Examples: Terraform >= 1.6.0, pinned provider versions, CMK encryption required,
     least-privilege IAM, no public ingress, prevent_destroy on prod stateful resources. -->

---

## Acceptance criteria

The IaC generation task is complete when all of the following are satisfied:

- [ ] All specified modules in `modules/` and environments in `environments/` are generated.
- [ ] Provider versions and Terraform core versions are explicitly pinned.
- [ ] Explicit CMK KMS encryption configured on all storage and messaging resources.
- [ ] IAM policies follow least privilege with scoped resource ARNs.
- [ ] All sensitive variables have `sensitive = true`.
- [ ] Passes `terraform fmt -check` and `terraform validate`.
- [ ] Zero live apply/destroy operations executed.

---

## Open decisions

| # | Decision | Owner | Target date | Status |
|---|---|---|---|---|
| 1 | <!-- Unresolved question blocking IaC generation --> | <!-- --> | <!-- --> | open |
