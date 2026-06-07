# Security Policy

## Supported versions

The iAccessibility Website is deployed continuously from this repository. Only the
current production site (built from `main`) is supported with security updates.

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues.

Instead, report them privately using GitHub's
[private vulnerability reporting](https://github.com/Community-Access/iAccessibility-Website/security/advisories/new)
("Report a vulnerability" under the Security tab). If you cannot use that, contact a
Community Access administrator directly.

When reporting, please include:

- A description of the issue and its potential impact
- Steps to reproduce, or a proof of concept
- Any affected URLs, components, or configuration

We will acknowledge your report as quickly as we can, keep you updated on our progress,
and credit you once the issue is resolved (unless you prefer to remain anonymous).

## Sensitive data

This site uses a Neon Postgres database. Database credentials are restricted to Community
Access administrators and must never be committed to the repository. If you discover any
credential, token, or secret committed to this repository, please report it privately
using the process above so it can be rotated.
