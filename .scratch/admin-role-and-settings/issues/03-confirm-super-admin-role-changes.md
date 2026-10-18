# 03: Confirm and safeguard Super Admin role changes

**What to build:** A Super Admin can grant or remove Super Admin access through the Admin & Roles page with a clear confirmation, while the shop is protected from losing its last active Super Admin.

**Blocked by:** 02 — Search accounts and manage Admin access.

**Status:** ready-for-agent

- [ ] Super Admin can promote an active customer or Admin to Super Admin and demote an existing Super Admin through the role-management page.
- [ ] Before a change to or from Super Admin is saved, a confirmation identifies the target account, current role, proposed role, and access impact.
- [ ] Cancelling the confirmation leaves the profile unchanged; confirming applies the selected role and reports success or failure.
- [ ] The trusted role-change operation atomically rejects demoting or removing the last active Super Admin, including when concurrent requests occur.
- [ ] A Super Admin may change their own role only when another active Super Admin remains; the same confirmation and last-account protection apply.
- [ ] After a role change, the affected session's authorization state refreshes promptly and protected operations enforce the new role.
- [ ] Firebase Emulator browser coverage verifies confirmation, cancellation, successful changes, self-demotion behavior, final-Super-Admin protection, and denied protected writes after access is removed.
