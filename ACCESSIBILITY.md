# Accessibility

The VoiceLK website should let people explore the product, read its supporting research, listen to samples
and contact the team using different devices and assistive technologies. The
maintainers aim toward WCAG 2.2 Level AA; this is a goal, not a conformance claim.
A complete independent audit and assistive-technology support matrix have not
been completed.

## Current implementation and limitations

Public content is returned as readable initial HTML with Markdown alternatives.
The application includes image alt fields, a decorative-image option, audio
transcript fields, native FAQ disclosure controls and reduced-motion handling.
Publishing checks require descriptions for informative images. These features
do not establish that every page or existing article is accessible.

Older images may still use contextual fallbacks rather than authored descriptions.
Authors must review transcripts, complex charts and tables, and externally hosted
videos. The interactive editor and image lightbox need keyboard/focus testing;
this document does not claim they have passed. Sinhala pronunciation varies by
screen reader and installed voices. Language changes within mixed-language
articles also need manual review.

## Reporting a barrier

Use the repository's **Accessibility barrier** issue template, or email
**rootcode.projects@gmail.com** with the subject `VoiceLK accessibility` if a
public issue or GitHub itself is inaccessible. Include the page or feature,
what you wanted to do, what prevented it, and your browser/assistive technology
if known. Screenshots and recordings are optional; written reports are welcome.
Remove personal information and private tokens from URLs and attachments.

You do not need to identify a WCAG criterion or disclose a disability. Explain
whether the task is blocked or a workaround exists. Maintainers should prioritise
blocked reading, navigation and form submission, discuss a workaround where
possible, and record progress in the issue. No fixed resolution date is promised.
Use [SECURITY.md](SECURITY.md) for sensitive vulnerabilities.

## Contributor checks

For changes to public or admin interfaces:

- Complete the task using only the keyboard; check focus visibility, order,
  dialog exit and return focus, including the image viewer and editor controls.
- Check headings, control names, error announcements and FAQ expanded state
  with a screen reader. Record which environment you actually tested.
- Check zoom, narrow screens, contrast and reduced-motion preferences.
- Describe informative figures accurately; use empty alt only for decoration.
  Explain graphs in accompanying text and provide readable underlying values.
- Supply audio transcripts and video captions where applicable; review mixed
  Sinhala-English language announcements.

Use an automated accessibility checker as an additional check, not a substitute
for these tasks. `npm run test:seo` checks selected rendering and alt-text rules;
it is not a full WCAG audit. Include test results and known gaps in the PR.

## References and upkeep

Review this statement when the UI, media workflow or testing coverage changes.
It is informed by the [Accessibility Toolkit statement](https://github.com/open-source-accessibility/accessibility-toolkit/blob/main/ACCESSIBILITY.md),
adapted to this application's actual features and unverified areas. See
[WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the
[W3C image guidance](https://www.w3.org/WAI/tutorials/images/decision-tree/).
