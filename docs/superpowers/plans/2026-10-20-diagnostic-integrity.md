# Diagnostic integrity Implementation Plan

Goal: verify the current deployed diagnostic and fix confirmed validation/delivery regressions in the existing project.
Architecture: shared validation and normalization; restore the historical Make CRM contract with server-computed values; visible delivery state; external I/O mocked in local integration tests.
Tech Stack: Next 16, React 19, TypeScript, node:test + tsx.
Spec: user request, 2026-10-20; PR #10/#11.

Constraints: no synthetic production leads, no real sales messages, no new project/CRM, keep local/Preview/production evidence separate. HTTP success is not a CRM persistence receipt.

1. Add failing behavioral tests for conditional stale values, every required field, impossible missed training count, real route execution with captured I/O, absent CRM and upstream failure.
2. Normalize inactive answers in UI/API; show specific accessible correction hints and preserve confirmed numeric answers on resume; constrain missed count and mobile flex widths.
3. Restore historical Make/n8n transport contract from 4af60fb with normalized answers and server-derived score; require CRM acceptance before Telegram; report both statuses separately; display failures and manual retry using one lead_ref.
4. Run tests, TypeScript and build. Open PR/Preview. Test production and Preview UI without final contact submission, and invalid-only APIs. Record unverified real CRM/CloserOS/Telegram receipts explicitly.
