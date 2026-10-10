# Security Policy

## Maintenance scope

Security fixes are intended for the current development line and its latest
deployment. There is no established backport policy for older commits, forks or
separate VoiceLK projects. This is a research application, not a service with a
guaranteed security-response SLA.

## Report privately

Email **rootcode.projects@gmail.com** with the subject `VoiceLK security report`.
Do not open a public issue or pull request containing a vulnerability or exploit.
If the repository offers GitHub's private vulnerability reporting, that is also
an option; its availability must be confirmed in the repository's Security tab.

Include:

- Affected component, route, commit or deployment version.
- A concise description, impact and prerequisites.
- Minimal reproduction steps using your own test accounts and synthetic data.
- Relevant redacted evidence and an optional suggested mitigation.
- A contact method for follow-up, if different from the sender address.

Do not send passwords, connection strings, authentication cookies, unsubscribe
tokens, subscriber lists, contact messages or other people's data. Start with a
summary if details require a more suitable private transfer channel; ordinary
email is not an encrypted disclosure system.

## Safe research and coordinated disclosure

Use a local or explicitly authorised test environment. This policy does not grant
permission to scan or attack production, bypass access controls, extract data,
send bulk email, disrupt service or test third-party infrastructure. Stop testing
if personal information is exposed and report the issue without copying that data.

Maintainers should assess the report, discuss a fix and coordinate public
disclosure with the reporter where practical. No bounty, legal safe harbour or
fixed response deadline is offered. If you do not hear back, follow up by email;
do not post confidential details to attract attention.

## Suspected secret exposure

Notify the maintainers privately. The owner should revoke or rotate the affected
credential promptly, check its use, and remove exposed copies from code, logs and
history as appropriate. Deleting a file alone does not invalidate a credential.

## Contributor safeguards

Use development-only databases and synthetic test records. Keep server secrets
out of browser bundles and `VITE_*` variables. Review dependencies and preserve
draft access restrictions, administrative authentication and analytics redaction.
Use [ACCESSIBILITY.md](ACCESSIBILITY.md) for non-security access barriers and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community safety concerns.
