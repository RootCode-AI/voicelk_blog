# Repository administrator setup

Target: `RootCode-AI/voicelk_blog`. These files do not modify `voicelk_ml` or
automatically change any GitHub repository settings.

## About description

Copy the single line in [repository-description.txt](repository-description.txt)
into the repository's About description. The project website is `https://voicelk.dev`.
The README explains the journal's goals, but editing it does not update GitHub's
About field. The saved description has not yet been applied on GitHub.

## Community files

Review and merge the root README, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY and
ACCESSIBILITY documents, plus the issue and PR templates, into the repository's
default branch. Then check the Community Standards page and issue chooser on
GitHub. Local file creation alone does not mark the live checklist complete.

The maintainers' reporting address is `rootcode.projects@gmail.com`. Ensure someone
monitors it and agrees to the moderation and disclosure processes before publishing.
No automated CI, response deadline or full accessibility conformance is claimed.

## License decision required

No `LICENSE` file has been added because the owner has not selected terms. Do not
add a placeholder file that could be mistaken for an actual license.

The owner should confirm the intended license, copyright holder, and which code,
documentation and media it covers. Check university, contributor and third-party
rights; model weights, speech recordings and datasets may need separate terms.
Once decided, add the unmodified chosen license with the appropriate notice and
update the README. This repository should not be advertised as open source until
that decision is resolved. See [GitHub's licensing guide](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository).

## Accept content reports

This is an administrator-controlled GitHub setting, not something a Markdown file
can enable. GitHub documents this feature for public organization repositories.
In repository **Settings**, look under **Moderation options** for
**Reported content**, choose a reporting audience and save the setting.
Review reports regularly. The Code of Conduct supplies an email fallback; it does
not imply the GitHub switch is enabled.

See [GitHub's reporting-settings documentation](https://docs.github.com/en/communities/moderating-comments-and-conversations/managing-how-contributors-report-abuse-in-your-organizations-repository).

## Private vulnerability reporting

If available, enable GitHub's private vulnerability reporting in the repository's
security settings, and verify that reports reach the maintainers. The email path
in SECURITY.md works independently of that setting. Do not claim this feature is
active without checking it on GitHub.

## Pending outside this workspace

- Apply the About description.
- Select and approve a license.
- Enable and verify content reporting and, optionally, private vulnerability reporting.
- Review, commit and push the community files; verify the live checklist.

No repository settings, remote commits or pushes were performed when these local
files were prepared.
