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

## Trisomy 21 karyotype

- Internal ID: `img-t21` (course data: `fig10-1`)
- Creator/credit: CDC / Dr. Allan J. Ebbin (1967)
- Source page (external, unchanged): <https://phil.cdc.gov/Details.aspx?pid=12504>
- Original runtime image URL (used through 2026-07-30, now localized):
  <https://wwwn.cdc.gov/phil/PHIL_Images/12504/12504_lores.jpg>
- **Local file (as of 2026-07-31):** `assets/images/cdc-phil-12504-trisomy21-karyotype.jpg`
- Retrieved: 2026-07-31, from the original runtime image URL above (byte-for-byte
  the same file the page already displayed remotely; no re-encoding or editing)
- File hash: `sha256:0958251e8896b340c677b2ddb14436ba860ee344604f3cf08a787177daf9e995`
- File size: 31,373 bytes; decoded dimensions 700x563
- Rights basis: CDC Public Health Image Library public-domain record
- Course modification: displayed responsively; no source-image editing claimed
- Redistribution status in manifest: approved
- Last repository verification: 2026-07-31

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
