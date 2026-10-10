"""Build local Chinese-only WOFF2 subsets from official Chill JinshuSong CC Light / Text Regular OTFs.
Usage: python fonts/build_jinshu.py --source-dir PATH --asset-version RELEASE_NUMBER
Requires fonttools and brotli; original files may be named light.otf / regular.otf.
"""
from pathlib import Path
import argparse
import sys
import re
from html.parser import HTMLParser
root = Path(__file__).resolve().parent.parent
local_tools = root / '.workbuddy/font-tools'
if local_tools.exists():
    sys.path.insert(0, str(local_tools))
from fontTools import subset
from fontTools.ttLib import TTFont
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, required=True)
parser.add_argument('--asset-version', type=str, required=True)
args = parser.parse_args()
def read_copy(names):
    parts = []
    # Preserve strings, remove JS comments; implementation comments are not copy.
    js_tokens = re.compile(r'''("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|/\*[\s\S]*?\*/|//[^\r\n]*''')
    class CopyParser(HTMLParser):
        def handle_data(self, data):
            parts.append(data)
        def handle_starttag(self, tag, attrs):
            parts.extend(value for _, value in attrs if value)
    for name in names:
        text = (root / name).read_text(encoding='utf-8-sig')
        if name.endswith('.html'):
            CopyParser().feed(text)
        else:
            parts.append(js_tokens.sub(lambda m: m.group(1) or '', text))
    return ''.join(parts)

def chinese_points(text):
    return {ord(ch) for ch in text if 0x2E80 <= ord(ch) <= 0x9FFF or 0xF900 <= ord(ch) <= 0xFAFF or 0xFF00 <= ord(ch) <= 0xFFEF}

common = chinese_points(read_copy(['index.html', 'main.js', 'i18n.js']))
guide = chinese_points(read_copy(['install.html', 'install.js', 'install-copy.js'])) - common
css = ['/* Chill JinshuSong CC v1.7, Light / Text Regular. Chinese-only website subsets; OFL-1.1. */']
css.append('@font-face { font-family: "Source Serif 4"; font-style: normal; font-weight: 400 500; font-display: swap; src: url("./source-serif4-latin.woff2?v=140") format("woff2"); }')
for weight, name in [(400, 'light'), (500, 'regular')]:
    src = args.source_dir / (name + '.otf')
    if not src.exists():
        src = args.source_dir / (('ChillJinshuSongCCLight' if name == 'light' else 'ChillJinshuSongCCTextRegular') + '.otf')
    for suffix, points in [('', common), ('-guide', guide)]:
        font = TTFont(src)
        missing = points - font.getBestCmap().keys()
        assert not missing, 'Missing website characters: ' + ''.join(chr(cp) for cp in sorted(missing))
        options = subset.Options()
        options.flavor = 'woff2'
        options.layout_features = ['*']
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=sorted(points))
        sub.subset(font)
        font.flavor = 'woff2'
        target = root / 'fonts' / ('jinshu-' + name + suffix + '.woff2')
        font.save(target)
        ranges = ','.join('U+' + format(cp, 'X') for cp in sorted(points))
        css.append('@font-face { font-family: "Chill JinshuSong Text"; font-style: normal; font-weight: ' + str(weight) + '; font-display: swap; src: url("./' + target.name + '?v=' + args.asset_version + '") format("woff2"); unicode-range: ' + ranges + '; }')
        print(name + suffix, len(points), 'characters,', target.stat().st_size, 'bytes')
(root / 'fonts/jinshu.css').write_text('\n'.join(css) + '\n', encoding='utf-8')
