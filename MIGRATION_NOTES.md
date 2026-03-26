# Migration Notes

## Migration Goal

Create a clean public repository for Amazon Granite without leaking unrelated workspace history or local-only artifacts.

## What Was Migrated

The repository was populated from the committed `AmazonGranite-Rebranding` subtree of the source workspace.

Included:
- frontend source snapshot
- supplier scraper source
- committed static assets
- project notes and planning files

Excluded or cleaned up:
- unrelated monorepo history
- workspace-level files outside the Amazon Granite subtree
- generated scraper output (`supplier-scraper/featured-stones.output.json`)
- local build caches, logs, and environment files via `.gitignore`

## Important Constraint

The recovered subtree is incomplete as an application.

Examples:
- `frontend/pages/index.jsx` references shared components that are not present in the recovered subtree
- the frontend subtree does not currently include its own package manifest

That is intentional for this migration: preserve the committed project snapshot safely first, then rebuild missing runtime pieces in follow-up work.

## Recommended Next Actions

1. restore or recreate missing frontend components
2. add explicit frontend package metadata and pinned dependencies
3. add CI, dependency updates, and secret scanning
4. document local development and deployment workflows
5. review all media rights before broader distribution or commercial launch
