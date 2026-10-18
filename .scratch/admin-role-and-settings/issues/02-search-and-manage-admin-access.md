# 02: Search accounts and manage Admin access

**What to build:** A Super Admin can find an existing active user profile and grant or remove Admin access from a dedicated page in the admin navigation, while unauthorized users cannot open or use the page.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] An Admin & Roles navigation item is visible only to Super Admin.
- [ ] The role-management route requires an active Super Admin, including when opened directly.
- [ ] Super Admin can search existing user profiles by name or email and see each result's identity, current role, and account status.
- [ ] Only active customer and Admin profiles can be assigned or changed to the Admin role; suspended profiles cannot be promoted.
- [ ] Super Admin can promote a customer to Admin or return an Admin to the customer role without changing unrelated profile data.
- [ ] Role changes use a trusted operation that verifies the caller and target account; direct client requests cannot bypass role checks.
- [ ] Firebase Emulator browser coverage verifies navigation access, searching, successful Admin role changes, persistence, and rejection for non-Super Admin callers.
