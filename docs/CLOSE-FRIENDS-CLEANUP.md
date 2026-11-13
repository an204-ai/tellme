# Close-friends cleanup — 2026-11-14

Completed against database `tellme`, with a private full snapshot and original-image backups in the gitignored `backups/` directory. The receipt `clone-cleanup-2026-11-14-final.json.receipt.json` records the verified result. Backup files contain personal data and must remain private.

Removed the seven accounts explicitly selected by the owner. Related removals: 3 conversations, 47 messages, 91 notifications, 169 old background jobs, 2 sessions, 1 push subscription and 6 exclusive media assets. Cleared the remaining nonreciprocal edges and invalid moment reaction; valid mutual relationships and retained conversations remain.

The final database has 7 users, 3 conversations, 54 messages and 3 stories. Verification found no approved clone accounts, one-way edges or invalid reactions.

## Collection audit

All 12 existing collections are referenced by current services. **No existing collection is obsolete or ready to drop.** Empty collections still support active features.

- `users`, `friend_requests`: identity and accepted friendships.
- `sessions`, `auth_tokens`: sign-in and verification/recovery.
- `stories`, `media`: moments and image lifecycle.
- `conversations`, `messages`: messaging.
- `notifications`, `push_subscriptions`: notifications.
- `reports`: reporting/moderation.
- `background_jobs`: active media and notification outbox.

The completed one-time cleanup scripts and their disposable fixtures were removed before release. This cleanup is not a deployment hook.
