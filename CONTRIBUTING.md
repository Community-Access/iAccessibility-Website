# Contributing to the iAccessibility Website

Thank you for helping build iaccessibility.net. This is a community project, and
contributions are welcome from everyone. The guiding principle is simple: *Making
Success Accessible*. Accessibility is not optional here — it is the reason the site
exists.

Please also read our [Code of Conduct](CODE_OF_CONDUCT.md) and
[Security Policy](SECURITY.md).

## Branching model: Git flow

This project follows **Git flow**. There are two long-lived branches:

- **`main`** — production. Always deployable. Never commit directly.
- **`develop`** — integration branch. This is the default target for your pull requests.

Supporting branches:

- **`feature/*`** — new work. Branch off `develop`, open a PR back into `develop`.
- **`release/*`** — release preparation. Branch off `develop`, merge into both `main` and `develop`.
- **`hotfix/*`** — urgent production fixes. Branch off `main`, merge into both `main` and `develop`.

## How to contribute

All contributions come in through pull requests. There is no direct pushing to `main`
or `develop`.

1. **Fork** this repository (or, if you are a member of the Community-Access org with
   write access, create a branch).
2. **Create a branch** off `develop`, using a Git flow name such as
   `feature/icast-episode-list` or `hotfix/report-card-contrast`.
3. **Make your change.** Keep pull requests focused — one logical change per PR is much
   easier to review.
4. **Test it.** Run the site locally and verify your change works, including with a
   keyboard and a screen reader where relevant (see Accessibility standards below).
5. **Open a pull request** against `develop` (or against `main` for a hotfix). Describe
   what you changed and why. Link any related issue.
6. **Respond to review.** A maintainer will review your PR. Database changes require
   review from a Community Access administrator (see Database changes below).

By contributing, you agree that your contributions are licensed under the same license
as this repository.

## Accessibility standards

Every change to user-facing content must meet **WCAG 2.2 Level AA**. Pull requests that
introduce accessibility regressions will not be merged. Specifically:

- Use **semantic HTML** before reaching for ARIA (`<button>`, not `<div role="button">`).
- **One `<h1>` per page**, and never skip heading levels.
- Every interactive element must be **reachable and operable by keyboard**.
- Text contrast must be at least **4.5:1**; UI component and graphical contrast at least **3:1**.
- **Never convey information by color alone.**
- Manage **focus** on route changes, dynamic content, and deletions.
- Provide **meaningful alternative text** for images, and descriptive link text
  (no "click here" or "read more").
- Modals must **trap focus** and **return focus** on close.
- Announce dynamic updates with appropriate **live regions**.

### No emojis

Do not use emojis anywhere — not in the website UI, not in documentation, not in commit
messages, and not in pull request or issue descriptions. Emojis are announced
inconsistently and verbosely by screen readers and do not meet the accessibility
principles we hold at Community Access. If a symbol carries real meaning, use a clearly
labeled icon with a text alternative instead.

## Database changes

This site uses a **Neon** Postgres database. Database changes are sensitive and are
**restricted to Community Access administrators only.**

- **Never commit database credentials.** The Neon connection string and any other
  secrets must never appear in the repository, in `.env` files that are committed, in
  code, or in pull requests. See `.env.example` for the expected variable names only.
- **Schema and migration changes** (anything under the database/migration paths, see
  `.github/CODEOWNERS`) require review and approval from a Community Access administrator
  before they can be merged. Administrators are the only people with access to the
  production Neon credentials.
- If your contribution needs a schema change, **open an issue or draft PR describing the
  change** and an administrator will work with you to apply it safely.

If you are not a Community Access administrator, you can still contribute everything else
— content, components, styling, accessibility fixes, bug fixes — without touching the
database layer.

## Questions

Open an issue if anything here is unclear. We would rather answer a question than have
you guess.
