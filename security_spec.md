# Security Specification — REDLINE '88 Firestore Rules

## 1. Data Invariants
1. **Default Deny**: All unspecified paths and subcollections under `/databases/{database}/documents` are denied for both reads and writes.
2. **Private Garage Isolation (`/playerSaves/{userId}`)**:
   - Contains zero PII (only game economy state and arcade callsign).
   - Only the verified authenticated owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) can `get`, `create`, `update`, or `delete` their own save document.
   - `list` is strictly denied to prevent enumeration of player saves.
   - `ownerId` and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
   - Arrays `ownedCars` (max 10) and `defeatedRivals` (max 30) are strictly size-bounded and type-checked.
   - `cash` is bounded to `[0, 99999999]`, `highestUnlockedTier` to `[1, 5]`.
3. **Global Leaderboard Integrity (`/leaderboardEntries/{entryId}`)**:
   - Contains zero PII (only arcade callsign, car specs, paint hex, and run telemetry).
   - Deterministic ID format: `{uid}_t{tier}` validated with `isValidId(entryId)` and exact prefix matching (`entryId == request.auth.uid + '_t' + string(incoming().tier)`).
   - Public reads (`get`, `list`) are allowed strictly when `resource.data.isPublic == true`.
   - Writes (`create`, `update`, `delete`) require verified authentication (`isVerifiedUser()`) and strict ownership (`incoming().uid == request.auth.uid`).
   - Physics bounds prevent impossible cheated records: `etMs` in `[3200, 35000]`, `trapMph` in `[50, 365]`, `reactionMs` in `[0, 5000]`, `tier` in `[1, 5]`.
   - `uid`, `tier`, `isPublic`, and `createdAt` are immutable after creation; updates use explicit action-based `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Save Write**: Creating `/playerSaves/userA` with `auth == null` -> `PERMISSION_DENIED`.
2. **Cross-User Save Read**: `userB` attempting `get` on `/playerSaves/userA` -> `PERMISSION_DENIED`.
3. **Save Collection Scraping**: `userA` attempting `list` on `/playerSaves` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Save**: `userA` creating `/playerSaves/userA` with extra ghost field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Unverified Email Spoofing**: User with `email_verified: false` creating `/leaderboardEntries/uid_t1` -> `PERMISSION_DENIED`.
6. **Leaderboard Identity Spoofing**: `userB` creating `/leaderboardEntries/userA_t1` with `uid: "userA"` -> `PERMISSION_DENIED`.
7. **Leaderboard ID Poisoning**: Creating `/leaderboardEntries/` with a 1500-char junk ID -> `PERMISSION_DENIED`.
8. **Impossible Cheated Time**: `userA` submitting `etMs: 100` (0.100s quarter-mile) -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: `userA` creating a record with backdated `createdAt` != `request.time` -> `PERMISSION_DENIED`.
10. **Immutable Field Tampering**: `userA` updating `createdAt` or `uid` on an existing leaderboard entry -> `PERMISSION_DENIED`.
11. **Array Exhaustion (Denial of Wallet)**: `userA` writing 50 elements into `ownedCars` -> `PERMISSION_DENIED`.
12. **Value Poisoning on Update**: `userA` updating whitelisted key `driverName` with a boolean `true` or 500-char string -> `PERMISSION_DENIED`.
