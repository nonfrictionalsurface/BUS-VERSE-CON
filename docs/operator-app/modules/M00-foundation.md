# M00 - Foundation

**Goal:** Expo app boots, navigation works, theme loads. No API calls yet.

**Time:** 2-3 h.

## Files created

- `apps/operator-app/` - 20 files
- `docs/operator-app/STATUS.md`

## Acceptance checklist

- [ ] `cd apps\operator-app && pnpm install` succeeds
- [ ] `pnpm start` prints QR + "Metro waiting on..."
- [ ] Scan QR with Expo Go -> app opens on phone
- [ ] Splash -> Phone after 800ms
- [ ] Phone -> type number -> Continue -> OTP screen
- [ ] OTP -> 123456 -> Verify -> Today screen
- [ ] Today shows "No trips yet"
- [ ] Theme shows emerald green

## LAN IP baked in

`10.117.2.179` (auto-detected at scaffold time). If wrong, edit `apps\operator-app\.env`.