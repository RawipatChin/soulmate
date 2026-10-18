# Admin Role Management and Role-Based Settings

Status: ready-for-agent

## Problem Statement

The shop owner cannot manage staff permissions from the application. There is no page for finding an existing user and promoting them to Admin or Super Admin. Today, `/admin/settings` and payment configuration are restricted to Super Admin, while the Settings navigation item is visible without role-based filtering. This leaves routine operational configuration inaccessible to Admin and makes later staff-role changes depend on manual database work.

## Solution

Add a Super Admin-only **Admin & Roles** page for searching existing user profiles and changing their roles. Require a clear confirmation whenever a change assigns or removes Super Admin, and prevent changes that would leave the shop without an active Super Admin.

Keep Settings as one continuous page with no inner category navigation. Admin can edit shipping options and storefront announcements; Super Admin can edit those plus store identity/contact details and payment settings. The existing order-number format is read-only because order creation currently generates it in code and has no supported setting to persist. The visible sections and all writes must be protected by role checks in the application and Firestore/server boundary.

The first active Super Admin is provisioned before handoff. After handoff, the shop owner manages all subsequent role changes in the application.

## User Stories

1. As a Super Admin, I want an Admin & Roles item in the admin navigation, so that I can reach staff permission management from the back office.
2. As an Admin, I want the Admin & Roles item hidden, so that the navigation only presents actions I am allowed to perform.
3. As an Admin, I want direct access to the role-management URL denied, so that hiding a menu item is not the only access control.
4. As a Super Admin, I want to search existing user profiles by name or email, so that I can find the right person without browsing a long customer list.
5. As a Super Admin, I want each result to show the person's name, email, current role, and account status, so that I can verify the identity and eligibility before making a change.
6. As a Super Admin, I want only active existing accounts to be eligible for staff roles, so that a suspended account cannot gain administrative access.
7. As a Super Admin, I want to promote an active customer account to Admin, so that I can delegate day-to-day store work without creating a second login manually.
8. As a Super Admin, I want to promote an active customer or Admin account to Super Admin, so that the shop owner can delegate full control from the application.
9. As a Super Admin, I want to demote an Admin or Super Admin to a lower role, so that I can remove access that is no longer needed.
10. As a Super Admin, I want a confirmation that names the account and shows its current and proposed roles before any change involving Super Admin is saved, so that I can catch mistakes with high-impact access.
11. As a Super Admin, I want to cancel the confirmation without changing the account, so that I can safely review a proposed role change.
12. As a Super Admin, I want the system to block demoting or removing the last active Super Admin, so that the shop cannot lock itself out of role management.
13. As a Super Admin changing my own role, I want the same confirmation and last-Super-Admin protection, so that I cannot accidentally remove the only account able to restore access.
14. As a Super Admin, I want a successful role change reflected in the list and the affected account's authorization state, so that the result is understandable and takes effect promptly.
15. As an Admin, I want to edit shipping methods and shipping prices from the shared Settings page, so that I can maintain routine delivery operations.
16. As an Admin, I want to edit storefront announcement messages, so that I can publish operational notices without needing full store configuration access.
17. As an Admin, I want store identity and payment settings hidden and the order-number format read-only, so that sensitive configuration remains under Super Admin control and the display matches actual behavior.
18. As a Super Admin, I want all supported Settings sections available on the same page, so that I can manage the store without switching between role-specific settings pages.
19. As either role, I want the Settings page to remain a continuous page without a category navbar, so that its content behaves like the earlier single-page layout.
20. As either role, I want the sticky save bar to appear only after I make a change, so that the page stays uncluttered when there is nothing to save.
21. As either role, I want Cancel to discard unsaved changes and Save to persist permitted changes, so that I can control when configuration takes effect.
22. As an Admin, I want a clear permission error if I attempt a Super Admin-only write through a stale page or direct request, so that access limits remain clear and secure.
23. As a Super Admin, I want a clear success or failure result after saving settings or a role change, so that I know whether the change was applied.
24. As a shop owner receiving the application, I want the initial owner account already provisioned as Super Admin, so that I can manage later staff roles without editing Firebase data myself.

## Implementation Decisions

- The authoritative staff role remains the role on an existing user profile. The separate administrative-account collection is not an authorization source.
- Add a dedicated Admin & Roles route protected as Super Admin-only and a matching navigation entry visible only to Super Admin.
- Search existing user profiles by display name and email. Show role and status; permit role changes only for active profiles. Account creation, invitations, and status changes are not part of this feature.
- Support the existing customer, admin, and super_admin roles. The page changes a role only; it does not edit unrelated profile or customer data.
- Role changes must be performed through a trusted server-side operation that verifies the caller is an active Super Admin, verifies the target profile is active, accepts only supported roles, and atomically prevents removing or demoting the last active Super Admin. Direct client writes must not bypass these checks.
- Changes to or from Super Admin require an explicit confirmation showing the target identity, current role, proposed role, and the effect on access. Cancel leaves data unchanged. Last-Super-Admin violations return an actionable error.
- The affected account's current authorization state must refresh promptly after a role change; protected writes continue to be enforced by the current server-side role even if an open page is stale.
- Keep one `/admin/settings` page and remove the inner category navigation. Admin sees and can edit shipping methods/prices and storefront announcements. Super Admin sees those sections plus store identity/contact details and payment settings. The order-number format remains read-only until order creation supports a persisted configurable format.
- Keep payment-account/PromptPay configuration Super Admin-only. Do not expose payment configuration to Admin through disabled controls or hidden-only UI; enforce permission at the write boundary.
- The settings save bar is hidden while the page is pristine, appears on unsaved changes, saves only role-permitted fields, and Cancel restores the last loaded values.
- Provision the first active Super Admin before handing the application to the shop owner. Routine role assignments after handoff use the new UI.
- No new glossary term conflicts with the existing SOULMATE language. Admin and Super Admin definitions are captured in the domain glossary.

## Testing Decisions

- Prefer one browser-level Firebase Emulator flow as the highest useful seam. It should exercise authenticated navigation, role management, settings visibility, and real Firestore/server authorization together rather than testing markup or internal helpers alone.
- Test observable behavior: Admin cannot see or open Admin & Roles; Super Admin can search and change an active profile's role; confirmation cancellation leaves the profile unchanged; confirmation persists the change; a suspended profile cannot be promoted; the last active Super Admin cannot be demoted; stale or direct Admin writes to Super Admin-only settings fail; permitted Admin shipping/announcement changes persist; Super Admin-only settings remain editable by Super Admin.
- Test Settings dirty-state behavior through the page: no save bar before edits, save bar after an edit, Cancel restores saved values, and Save persists permitted values.
- Exercise a role change in an active session and verify that removed Super Admin access no longer works after the profile refresh, including a denied protected write.
- Reuse the existing browser-emulator smoke-test approach used for order flows and the existing admin-shell browser smoke coverage for navigation and embedded shell behavior. Unit tests may cover pure role eligibility/access decisions where they add value, following existing account-access test conventions.
- Do not couple tests to component structure, CSS class names, or specific rendering implementation. Assert user-visible actions and persisted authorization outcomes.

## Out of Scope

- Creating Firebase Authentication accounts, invitations, password resets, or account deletion.
- Editing account status, customer profile fields, or personal data from the Admin & Roles page.
- Changing the business permission model beyond the Admin and Super Admin boundaries described above.
- Adding separate Settings pages or an inner navigation for Settings categories.
- Changing role assignments from Firebase Console after the initial owner account is provisioned.
- Adding a general audit-history screen or staff activity dashboard.

## Further Notes

- Current sign-in validates the requested login type against the role stored on the user profile. Selecting a role on the login screen does not grant that role.
- Firestore currently allows Admins to list user profiles but requires Super Admin for role-sensitive profile writes and store/payment settings. The implementation must preserve that boundary while enabling Admin-only operational settings.
- The `settings/public` document currently contains multiple operational values. Its rules must distinguish Admin-editable shipping/announcement fields from Super Admin-only configuration so Admin cannot overwrite unrelated settings through a broad document update.
- If the trusted role-change operation or Firebase Emulator setup is unavailable in a target environment, the UI must report the failure and must not fall back to a direct client write.
