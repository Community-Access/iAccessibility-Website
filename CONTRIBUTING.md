# Contributing to the iAccessibility Website

Thank you for helping build iaccessibility.net. This is a community project, and
contributions are welcome from everyone. The guiding principle is simple: *Making
Success Accessible*. Accessibility is not optional here — it is the reason the site
exists.

## How to contribute

All contributions come in through pull requests. There is no direct pushing to `main`.

1. **Fork** this repository (or, if you are a member of the Community-Access org with
   write access, create a branch).
2. **Create a branch** off `main` with a descriptive name, for example
   `fix/report-card-contrast` or `feat/icast-episode-list`.
3. **Make your change.** Keep pull requests focused — one logical change per PR is much
   easier to review.
4. **Test it.** Run the site locally and verify your change works, including with a
   keyboard and a screen reader where relevant (see Accessibility standards below).
5. **Open a pull request** against `main`. Describe what you changed and why. Link any
   related issue.
6. **Respond to review.** A maintainer will review your PR. Database changes require
   review from a community leader (see Database changes below).

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

### No decorative emoji

Do not use decorative emoji in the website UI, in documentation, or in commit messages
and pull request descriptions. Decorative emoji (for example a construction sign) are
announced inconsistently and verbosely by screen readers and do not meet the
accessibility principles we hold at Techopolis. If a symbol carries real meaning, use a
clearly labeled icon with a text alternative instead.

## Database changes

This site uses a **Neon** Postgres database. Database changes are sensitive and are
**restricted to community leaders only.**

- **Never commit database credentials.** The Neon connection string and any other
  secrets must never appear in the repository, in `.env` files that are committed, in
  code, or in pull requests. See `.env.example` for the expected variable names only.
- **Schema and migration changes** (anything under the database/migration paths, see
  `.github/CODEOWNERS`) require review and approval from a community leader before they
  can be merged. Community leaders are the only people with access to the production
  Neon credentials.
- If your contribution needs a schema change, **open an issue or draft PR describing the
  change** and a community leader will work with you to apply it safely.

If you are not a community leader, you can still contribute everything else — content,
components, styling, accessibility fixes, bug fixes — without touching the database
layer.

## Questions

Open an issue if anything here is unclear. We would rather answer a question than have
you guess.
