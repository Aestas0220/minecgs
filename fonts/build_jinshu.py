"""Build local Chinese-only WOFF2 subsets from official Chill JinshuSong CC Light / Text Regular OTFs.
Usage: python fonts/build_jinshu.py --source-dir PATH --asset-version RELEASE_NUMBER
Requires fonttools and brotli; original files may be named light.otf / regular.otf.
"""
from pathlib import Path
import argparse
import sys
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
text = ''.join((root / name).read_text(encoding='utf-8-sig') for name in ['index.html', 'install.html', 'main.js', 'i18n.js', 'install.js', 'install-copy.js'])
points = sorted({ord(ch) for ch in text if 0x2E80 <= ord(ch) <= 0x9FFF or 0xF900 <= ord(ch) <= 0xFAFF or 0xFF00 <= ord(ch) <= 0xFFEF})
css = ['/* Chill JinshuSong CC v1.7, Light / Text Regular. Chinese-only website subsets; OFL-1.1. */']
for weight, name in [(300, 'light'), (400, 'regular')]:
    src = args.source_dir / (name + '.otf')
    if not src.exists():
        src = args.source_dir / (('ChillJinshuSongCCLight' if name == 'light' else 'ChillJinshuSongCCTextRegular') + '.otf')
    font = TTFont(src)
    missing = set(points) - font.getBestCmap().keys()
    assert not missing, 'Missing website characters: ' + ''.join(chr(cp) for cp in sorted(missing))
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=points)
    sub.subset(font)
    font.flavor = 'woff2'
    target = root / 'fonts' / ('jinshu-' + name + '.woff2')
    font.save(target)
    ranges = ','.join('U+' + format(cp, 'X') for cp in points)
    css.append('@font-face { font-family: "Chill JinshuSong Text"; font-style: normal; font-weight: ' + str(weight) + '; font-display: swap; src: url("./' + target.name + '?v=' + args.asset_version + '") format("woff2"); unicode-range: ' + ranges + '; }')
    print(name, len(points), 'characters,', target.stat().st_size, 'bytes')
(root / 'fonts/jinshu.css').write_text('\n'.join(css) + '\n', encoding='utf-8')
