# Release Checklist

## Browser Flows

- [ ] Existing user logs in and logs out.
- [ ] Public registration is disabled and does not create accounts.
- [ ] Location can be set manually and by GPS permission path.
- [ ] Prayer tracker records on-time, late, and correction states.
- [ ] Dashboard reflects prayer, journal, streak, and Khazanah summary data.
- [ ] Journal draft recovers, saves, edits, conflicts, deletes, and clears after save/logout.
- [ ] Khazanah verse attachment stores trusted server snapshots.
- [ ] Statistics pages render week and month data.
- [ ] Profile edit saves name, phone, bio, and vibration preference.
- [ ] Account export downloads JSON without secrets/session/password hashes.
- [ ] Account deletion requires password, removes only that user, and blocks future login.
- [ ] Cross-user URL/resource access returns safe not-found or empty states.

## Accessibility And Responsive

- [ ] Keyboard navigation reaches every visible control.
- [ ] Focus rings are visible.
- [ ] Form inputs have labels and errors are announced visually.
- [ ] Buttons render native buttons unless intentionally links.
- [ ] Reduced motion does not depend on animation.
- [ ] Text has acceptable contrast on dark surfaces.
- [ ] 200% text zoom has no clipped primary controls.
- [ ] 360px, 390px, 768px, and desktop layouts have no overlap.
- [ ] No dead controls, mock-only actions, or unsupported product claims remain.
- [ ] Religious copy avoids unsupported Hadith/reminder/offline claims.

## Release Commands

- [ ] `pnpm check`
- [ ] `pnpm test`
- [ ] `pnpm db:verify`
- [ ] `pnpm build`
- [ ] `pnpm release:headers -- https://myniyyah.my.id`
- [ ] `/api/health` and `/api/ready` return `{"status":"ok"}` over HTTPS.
