# Third-Party Notices

This file records third-party material currently referenced or displayed by the
course. It is not a substitute for verifying the source record before a release.

## Normal human male karyotype (46,XY)

- Internal ID: `img-46xy` (course data: `fig8-1`)
- Creator/credit: National Human Genome Research Institute, Human Genome Project
- Source page (external, unchanged):
  <https://commons.wikimedia.org/wiki/File:NHGRI_human_male_karyotype.png>
- Original runtime image URL (used through 2026-07-30, now localized):
  <https://commons.wikimedia.org/wiki/Special:FilePath/NHGRI_human_male_karyotype.png?width=1100>
- **Local file (as of 2026-07-31):** `assets/images/nhgri-human-male-karyotype-46xy.png`
- Retrieved: 2026-07-31, from the original runtime image URL above (byte-for-byte
  the same file the page already displayed remotely; no re-encoding or editing)
- File hash: `sha256:956b733178670ff972164d9dcfc2df588f13781308115a8ba1c012363469e298`
- File size: 123,218 bytes; decoded dimensions 1280x1003
- Rights basis: public domain; work of the United States federal government
- Course modification: displayed responsively; no source-image editing claimed
- Redistribution status in manifest: approved
- Last repository verification: 2026-07-31

## Trisomy 21 karyotype (47,XY,+21)

- Internal ID: `img-t21` (course data: `fig10-1`)
- **Superseded image, removed 2026-08-01 (Issue tracked in this PR):** the
  course previously embedded a CDC Public Health Image Library image
  (`assets/images/cdc-phil-12504-trisomy21-karyotype.jpg`, CDC / Dr. Allan J.
  Ebbin, 1967, image #12504, `sha256:0958251e8896b340c677b2ddb14436ba860ee344604f3cf08a787177daf9e995`).
  Independent review of the live course found that image's chromosome
  morphology and band detail unacceptable for a professional cytogenetics
  study guide: heavily thresholded, low contrast, individual G-bands not
  reliably interpretable, chromosomes not individually numbered (only
  grouped, e.g. "C 6-12 + XX"), and — confirmed by decoding and directly
  reading the group label rather than assumed — the depicted karyotype is
  actually **female (46,XX-derived, i.e. 47,XX,+21)**, which did not match
  the course's own primary worked ISCN example directly below it
  (`47,XY,+21`). The file has been removed from `assets/images/` and from
  this record's "local file" status; its historical hash above is kept only
  as a provenance trail for what was previously embedded.
- Creator/credit: Wessex Regional Genetics Centre, via Wellcome Collection
- Source page (external, unchanged):
  <https://wellcomecollection.org/works/wmcdanw6> ("Down syndrome human
  karyotype 47,XY,+21", Miro image number `B0000249`, Miro library reference
  `BSIP 0282803`)
- Original runtime image URL (IIIF Image API, full resolution):
  <https://iiif.wellcomecollection.org/image/B0000249/full/full/0/default.jpg>
- **Local file (as of 2026-08-01):**
  `assets/images/wellcome-b0000249-trisomy21-karyotype-47xy.jpg`
- Retrieved: 2026-08-01, from the IIIF Image API URL above at its full native
  resolution (byte-for-byte as delivered; no re-encoding or editing)
- File hash: `sha256:aa062e66a0ca67a5a63c4ce12bdabccf28a811f622ad38340fdca54371cf2c43`
- File size: 135,316 bytes; decoded dimensions 1176x1158
- Rights basis: Wellcome Collection catalogue record for this specific
  digital item states an explicit, machine-readable license —
  `"license":{"id":"cc-by","label":"Attribution 4.0 International (CC BY 4.0)","url":"http://creativecommons.org/licenses/by/4.0/"}`
  — with `"accessConditions":[{"status":{"id":"open"}}]`, confirmed directly
  against `https://api.wellcomecollection.org/catalogue/v2/works/wmcdanw6?include=items,images,identifiers`
  on 2026-08-01, not merely inferred from the human-readable page. Required
  attribution per that record: credit "Wessex Reg. Genetics Centre".
- Content verification: the image itself was decoded and visually inspected
  (not assumed from its filename or page description) before selection —
  it is a genuinely arranged G-banded karyogram (chromosomes cut, paired,
  and laid out in numbered rows 1–22 plus X/Y, matching the standard
  A–G group layout this course teaches in Module 8/9), with the title
  "47,XY,+21 TRISOMY 21 (DOWN'S SYNDROME)" printed directly on the plate and
  an arrow indicating the third copy of chromosome 21. This step also ruled
  out a same-collection false lead: a separate, superficially similar
  Wikimedia Commons file titled "Human karyotype ... 47, XY, +21 (Down
  syndrome).jpg" (Josef Reischig archive, CC BY-SA 3.0, 3749x2399) was
  downloaded and inspected the same way and found to be a raw, unsorted
  metaphase spread — overlapping, unpaired chromosomes plus intact
  interphase nuclei still visible on the slide — not an arranged karyogram,
  so it was rejected despite its higher pixel resolution and permissive
  license. No image in this notice was selected from its filename, listing
  text, or license badge alone.
- No PHI: the plate shows only the arranged chromosomes and the printed
  diagnostic title; no patient name, date of birth, or accession/specimen
  number is visible anywhere in the image.
- Course modification: displayed responsively; no source-image editing
  (cropping, contrast adjustment, or annotation) applied beyond what the
  source plate already contained
- Redistribution status in manifest: approved
- Last repository verification: 2026-08-01

## IBM Plex Sans and IBM Plex Mono (webfonts)

As of 2026-07-31 the course self-hosts the exact IBM Plex weights it uses,
replacing the prior Google Fonts runtime request:

- Creator/credit: IBM Corp., with Reserved Font Name "Plex"
- Upstream project: <https://github.com/IBM/plex>
- License: SIL Open Font License, Version 1.1 — full text committed at
  `assets/fonts/ibm-plex-sans/LICENSE.txt` and `assets/fonts/ibm-plex-mono/LICENSE.txt`
  (identical text, `sha256:7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da`
  for both files), reproduced verbatim from
  <https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt> and confirmed
  byte-identical to the `LICENSE.txt` bundled inside each family's own release
  archive. The OFL permits embedding, bundling, and redistribution with
  software; it does not permit selling the fonts by themselves and reserves
  the name "Plex" for the original.
- Source release / retrieval:
  - IBM Plex Sans: GitHub release
    [`@ibm/plex-sans@1.1.0`](https://github.com/IBM/plex/releases/tag/%40ibm/plex-sans%401.1.0),
    asset `ibm-plex-sans.zip`, retrieved 2026-07-31
  - IBM Plex Mono: GitHub release
    [`@ibm/plex-mono@2.5.0`](https://github.com/IBM/plex/releases/tag/%40ibm/plex-mono%402.5.0),
    asset `ibm-plex-mono.zip`, retrieved 2026-07-31
  - Files used are the prebuilt, unmodified WOFF2 outputs from each release's
    own `fonts/complete/woff2/` directory (the full-glyph-set build IBM
    publishes; no subsetting, hinting change, or other modification applied)
- Weights committed (exactly the weights the course's own CSS requests, no
  more): IBM Plex Sans 400/500/600/700; IBM Plex Mono 400/500/600
- Local files and hashes:

  | File | SHA-256 |
  | --- | --- |
  | `assets/fonts/ibm-plex-sans/IBMPlexSans-Regular.woff2` | `ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a` |
  | `assets/fonts/ibm-plex-sans/IBMPlexSans-Medium.woff2` | `5660f8a658f8bb50dbc005232f885eadffd2bc1c235c4f6fbb63469d1f9cde6d` |
  | `assets/fonts/ibm-plex-sans/IBMPlexSans-SemiBold.woff2` | `f78048030eab62e860efa39a0df79e2e5581bf122eb95b9bc42c0b8a4988d205` |
  | `assets/fonts/ibm-plex-sans/IBMPlexSans-Bold.woff2` | `fa7130d854a660b39a7fc9e6e0f2dc23dba5f1346e2adea3e1fe37b6d884133d` |
  | `assets/fonts/ibm-plex-mono/IBMPlexMono-Regular.woff2` | `ba204497f16b6d334cee9d1e963a831b73e3a56e1d6300a8489d18df7214b350` |
  | `assets/fonts/ibm-plex-mono/IBMPlexMono-Medium.woff2` | `33faf307fa6031fb4062276d7320a6d632de890cbb347576fd80cfa01077bc25` |
  | `assets/fonts/ibm-plex-mono/IBMPlexMono-SemiBold.woff2` | `6a825b4824c01cbb401e829e5a066a1818411bcb3538b5a5792c5ca9b82343c3` |

- Modification: none — unmodified upstream release binaries, only relocated
  into this repository
- Redistribution status: approved (SIL OFL 1.1 explicitly permits bundling
  and redistribution with software)

## Names and marks

ASCP, ASCP Board of Certification, CG(ASCP), and CG(ASCPi) are referenced only
to describe the intended certification-examination alignment. This independent
project is not affiliated with, endorsed by, or sponsored by ASCP. No ASCP logo
or official visual identity is used.
