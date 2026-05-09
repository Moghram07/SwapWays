# Schedule PDF fixtures

Place optional reference PDFs here for local / CI integration tests:

- `line-1792.pdf` — Saudia line schedule export
- `calendar-2026-may.pdf` — CrewTool calendar export

If files exceed ~1 MB, track them with Git LFS.

Vitest tests use `.ts` text fixtures under `__tests__/schedule/` for deterministic parsing; PDFs can be added later for extraction smoke tests.
