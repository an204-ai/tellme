# Tellme database

Tellme uses MongoDB. Models live in `packages/database/src/models.ts`; collections and indexes are declared in `packages/database/src/database.ts`. The current collection audit is in `CLOSE-FRIENDS-CLEANUP.md`.

## First 100 accounts

`users.memberNumber` is a server-assigned, immutable creation sequence. The API exposes only `foundingMember: true` for numbers 1–100; clients cannot submit or edit the sequence. A unique partial index prevents duplicate numbers while allowing legacy records without a number.

`system_counters` stores `_id: "account-creation"` and its monotonically increasing `value`. Registration increments it and inserts the account in one MongoDB transaction. Failed registrations roll back the increment; deleting an account never makes its number available again. This requires a transaction-capable replica set, as already required by other Tellme writes.

The existing database was reconciled once against the private historical roster: 14 accounts have been created, 7 remain, and the 7 deleted places stay reserved. A private pre-change snapshot is retained in the gitignored `backups/` directory. Reconciliation is not an application startup or deployment hook.

`initializeMemberNumbers` supports an explicit, idempotent legacy backfill. On an empty counter, supply the complete historical roster to reserve deleted accounts’ places; an omitted history can only order surviving records. It never renumbers assigned accounts. Do not reset the production counter or rerun a fresh backfill over a restored subset without preserving historical positions.

`users.foundingWelcomedAt` records the first welcome. `POST /users/me/founding-welcome` atomically claims it for the authenticated founding account, returning `celebrate: true` only once. The pending flag is visible only in that account’s own DTO; profile updates cannot alter the number or welcome timestamp.
