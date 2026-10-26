## Summary
<!-- What changed and why. One logical change per PR. -->

## Type
- [ ] rules (`.bob/rules-*`)
- [ ] skill (`.bob/skills/*`)
- [ ] hook / installer / mode yaml
- [ ] AGENTS.md / README / CONTRIBUTING
- [ ] spec / template

## Spec / task reference
<!-- Link spec and task id, if applicable. -->

## Verification
<!-- How a reviewer can verify. Paste `npm test` output. -->

## Checklist
- [ ] `npm test` passes
- [ ] Dispatch table in `.bob/custom_modes.yaml` updated (if a rules file was added or renamed)
- [ ] `skills-lock.json` and AGENTS.md Skills table updated (if a skill was added or changed)
- [ ] No secrets, account IDs, org-specific endpoints, `.tfvars`, or Terraform state
- [ ] Conventional Commit messages
