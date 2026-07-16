# Project rules

- **Bump the version on every change.** Any code change — new feature, update, bug fix, or refactor — must include a bump of `"version"` in `package.json`, following semver:
  - **patch** (`0.6.0` → `0.6.1`): bug fixes, small tweaks, no behavior/API change.
  - **minor** (`0.6.0` → `0.7.0`): new features, non-breaking changes.
  - **major** (`0.6.0` → `1.0.0`): breaking changes.
  - Do this as part of the same change, not as a separate follow-up step.
