# Chinese website font

The site uses Chill JinshuSong CC Text (寒蝉锦书宋), version 1.7, for Chinese text, paired with the existing Source Serif 4 for Latin text. The English Hero title keeps its original Times family.

Official source: https://github.com/Warren2060/ChillJinshuSong/tree/main/寒蝉锦书宋CC_v1.7
License: SIL Open Font License 1.1, included as Chill-JinshuSong-OFL.txt.

jinshu-regular.woff2 and jinshu-medium.woff2 are website-only subsets of the official Text Regular and Medium OTFs. No outlines were modified. jinshu.css restricts their use to the Chinese characters and punctuation in the site source; Latin text continues to use Source Serif 4.

After adding new Chinese copy, regenerate the subsets:

1. Download and extract the official ChillJinshuSongCCTextRegular.otf.zip and ChillJinshuSongCCTextMedium.otf.zip to a local source directory.
2. Install Python fonttools and brotli if needed.
3. Run `python fonts/build_jinshu.py --source-dir <source-directory> --asset-version <release-number>` from the repository.
4. Update the font stylesheet cache version and the regular-font preload URL to the same release number when publishing new subsets.

Full source OTFs are intentionally omitted from the website to keep downloads small. Fonts fall back to installed Song/serif fonts while the webfont loads or if it is unavailable.
