# 01: Role-scoped single-page Settings

**What to build:** Admin and Super Admin can manage the settings appropriate to their role from one continuous Settings page, with changes persisted securely and clear save/cancel behavior.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Admin can open Settings and edit shipping methods, shipping prices, and storefront announcements.
- [ ] Admin cannot edit store identity/contact details or payment settings; the order-number format remains read-only.
- [ ] Super Admin can edit supported Settings sections, including store identity/contact details and payment settings.
- [ ] Settings remain on one continuous page without an inner category navbar.
- [ ] The sticky save bar is hidden until a permitted setting changes; Save persists changes and Cancel restores the last loaded values.
- [ ] Firestore/server authorization allows Admin to update only permitted operational fields and rejects attempts to overwrite Super Admin-only or unrelated fields.
- [ ] Firebase Emulator browser coverage verifies visibility, save/cancel behavior, persistence, and denied writes for both roles.
