# Key Recovery

| Secret | Impact | Time |
|---|---|---|
| `PII_ENCRYPTION_KEY` | CRITICAL - PII unreadable | Never rotate w/o re-encrypt plan |
| `JWT_SECRET` | Tokens invalidated | 0 min (reauth) |
| `PHONE_HASH_SALT` | `phone_hash` broken | Hours (rehash) |
| `QR_SIGNING_PRIVATE_KEY` | Tickets invalid | Reissue tickets |
| `QR_SIGNING_PUBLIC_KEY` | Same | Update w/ private |
| `ADMIN_RECOVERY_TOKEN` | One-shot | New on next use |
| `RAZORPAY_*` | Live fails | Dashboard |

## 1. JWT_SECRET

Cost: all sessions. OK if no pending booking.

`node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"`
Update `.env.production`, then `up -d --force-recreate api`.
Never rotate within 5 min of demo, while booking PENDING, or without backup.

## 2. PII_ENCRYPTION_KEY - DO NOT ROTATE CASUALLY

Encrypts `passenger_profiles.id_number` (D4). Wrong rotation = unrecoverable garbage.
Safe: backup -> save old as `PII_ENCRYPTION_KEY_OLD` -> add new `PII_ENCRYPTION_KEY` -> re-encrypt migration (Phase 13) -> verify -> remove OLD.

## 3. PHONE_HASH_SALT (1-2h job)

`phone_hash = HMAC(salt, phone)`. Rotating invalidates all hashes.
Export `users.id` + decrypted `phone` (needs PII_ENCRYPTION_KEY) -> rehash -> update rows -> rotate env.

## 4. QR_SIGNING keys

Format (verified from `apps/api/src/lib/ed25519.ts` `getKeypair()`):
- Private = 32-byte Ed25519 seed, base64
- Public = 32-byte Ed25519 pubkey, base64
- Both must decode to exactly 32 bytes or boot throws.

Generate new pair (copy the full line):
`node -e "const c=require('crypto');const {privateKey,publicKey}=c.generateKeyPairSync('ed25519');const sk=privateKey.export({type:'pkcs8',format:'der'}).slice(-32);const pk=publicKey.export({type:'spki',format:'der'}).slice(-32);console.log('QR_SIGNING_PRIVATE_KEY='+Buffer.from(sk).toString('base64'));console.log('QR_SIGNING_PUBLIC_KEY='+Buffer.from(pk).toString('base64'));"`

`.slice(-32)`: PKCS8 DER is 48B (16+32), SPKI DER is 44B (12+32). `@noble/ed25519@3.2.0` takes raw 32-byte form.

Never `pnpm update @noble/ed25519` (R45, pinned 3.2.0). Verify `pnpm test -- qr-vectors`.

## 5. Razorpay (order matters)

1. Dashboard: new key + webhook secret
2. Update `.env.production` both
3. `up -d --force-recreate api`
4. Dashboard: deactivate old

Do not deactivate old first - breaks live payments.

## 6. Where secrets live

`.env` (dev, ignored) / `.env.test` (tracked) / `.env.example` (tracked) / `.env.production.template` (tracked) / `.env.production` (gitignored, added Phase 12 Block 1) / `docs/secrets.local.md` (ignored) / password manager.

Verify: `git check-ignore -v .env.production` must match.