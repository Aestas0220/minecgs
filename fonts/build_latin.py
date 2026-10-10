"""Subset the official Source Serif 4 Latin variable font, preserving optical sizing."""
from pathlib import Path
import argparse
import sys
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / '.workbuddy/font-tools'))
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
args = parser.parse_args()
text = ''.join((root / name).read_text(encoding='utf-8-sig') for name in ['index.html', 'install.html', 'main.js', 'i18n.js', 'install.js', 'install-copy.js'])
points = set(range(32,127)) | {0xA0} | {ord(ch) for ch in text if 127 <= ord(ch) < 0x2E80}
font = TTFont(args.source)
instantiateVariableFont(font, {'wght': (400,500)}, inplace=True)
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
sub = subset.Subsetter(options=options)
sub.populate(unicodes=points & font.getBestCmap().keys())
sub.subset(font)
font.flavor = 'woff2'
target = root / 'fonts/source-serif4-latin.woff2'
font.save(target)
print('Latin variable font:', target.stat().st_size, 'bytes; optical sizes 8..60, weights 400..500')
