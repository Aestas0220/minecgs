# Chinese website font

The site uses LXGW WenKai Lite (霞鹜文楷), version 1.522, for Chinese text, paired with the existing Source Serif 4 for Latin text. The English Hero title keeps its original Times family.

Official source: https://github.com/lxgw/LxgwWenKai-Lite/releases/tag/v1.522
License: SIL Open Font License 1.1, included as LXGW-WenKai-OFL.txt.

wenkai-regular.woff2 and wenkai-medium.woff2 are website-only subsets of the official Regular and Medium TTFs. No outlines were modified. wenkai.css restricts their use to the Chinese characters and punctuation in the site source; Latin text continues to use Source Serif 4.

After adding new Chinese copy, regenerate the subsets:

1. Download the official LXGWWenKaiLite-Regular.ttf and LXGWWenKaiLite-Medium.ttf to a local source directory.
2. Install Python fonttools and brotli if needed.
3. Run `python fonts/build_wenkai.py --source-dir <source-directory> --asset-version <release-number>` from the repository.
4. Update the font stylesheet cache version and the regular-font preload URL to the same release number when publishing new subsets.

Full source TTFs are intentionally omitted from the website to keep downloads small. Fonts fall back to installed Kai fonts while the webfont loads or if it is unavailable.
