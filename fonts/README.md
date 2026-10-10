# Chinese website font

The site uses Chill JinshuSong CC (寒蝉锦书宋), Light and Text Regular, version 1.7, for Chinese text, paired with the existing Source Serif 4 for Latin text. The English Hero title keeps its original Times family.

Official source: https://github.com/Warren2060/ChillJinshuSong/tree/main/寒蝉锦书宋CC_v1.7
License: SIL Open Font License 1.1, included as Chill-JinshuSong-OFL.txt.

jinshu-light.woff2 and jinshu-regular.woff2 are homepage/shared-copy subsets of the official Light and Text Regular OTFs. The `-guide.woff2` files cover additional tutorial-only characters. No outlines were modified. Implementation comments are excluded; unicode-range prevents downloading tutorial subsets on the homepage.

Source Serif 4 is now hosted locally as source-serif4-latin.woff2, subset from the same official Google Fonts variable font. Optical sizing (8–60) and English weights 400–500 are preserved. Source-Serif-4-OFL.txt contains Adobe's license.

After adding new Chinese copy, regenerate the subsets:

1. Download and extract the official ChillJinshuSongCCLight.otf.zip and ChillJinshuSongCCTextRegular.otf.zip to a local source directory.
2. Install Python fonttools and brotli if needed.
3. Run `python fonts/build_jinshu.py --source-dir <source-directory> --asset-version <release-number>` from the repository.
4. Update the font stylesheet cache version and the light-font preload URL when publishing changed subsets. Keep binary URLs unchanged for unrelated CSS/JS releases.

Full source OTFs are intentionally omitted from the website to keep downloads small. Fonts fall back to installed Song/serif fonts while the webfont loads or if it is unavailable.

Shared CSS weights are 400 for reading and 500 for controls/emphasis. Chinese font-face descriptors map those weights to the official Light and Text Regular files, preserving the lighter Chinese appearance. Latin Source Serif 4 uses actual 400/500 weights independently. The Hero Times title retains weight 400.
