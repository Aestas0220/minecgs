const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
const start = source.indexOf('    /* —— MD3 Wavy Linear Progress：');
const end = source.indexOf('    /* —— 建造清单折叠面板', start);
assert(start >= 0 && end > start);
const progressCode = source.slice(start, end);

// Emulate an SVG renderer that ignores pathLength, as suspected in the iPad
// screenshot. Calculate actual polyline length from d, rather than a fixed stub.
function pathLength(d) {
  const coords = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  let length = 0;
  for (let i = 2; i < coords.length; i += 2) {
    length += Math.hypot(coords[i] - coords[i - 2], coords[i + 1] - coords[i - 1]);
  }
  return length;
}

let cases = 0;
for (const width of [320, 768, 1024, 1366]) {
  for (const value of ['0%', '15%', '50%', '100%', '-5%', '120%', 'invalid']) {
    const children = [];
    const vars = {};
    const classes = new Set();
    const frames = [];
    let onResize;
    const lp = {
      clientWidth: width,
      querySelector: () => ({ setAttribute() {}, appendChild: p => children.push(p) }),
      style: { setProperty: (key, val) => { vars[key] = val; } },
      classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
      offsetWidth: width,
    };
    vm.runInNewContext(progressCode, {
      document: {
        querySelector: () => lp,
        createElementNS: () => ({
          attrs: {},
          setAttribute(key, val) { this.attrs[key] = val; },
          getTotalLength() { return pathLength(this.attrs.d); },
        }),
      },
      getComputedStyle: () => ({ getPropertyValue: key => ({
        '--lp-value': value,
        '--md-linear-progress-wave-amplitude': '2.5px',
        '--md-linear-progress-wave-length': '16px',
        '--md-linear-progress-track-height': '4px',
      })[key] }),
      ResizeObserver: function (cb) { onResize = cb; this.observe = () => {}; },
      requestAnimationFrame: cb => frames.push(cb),
    });
    const parsed = parseFloat(value);
    const percent = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 15;
    function verify() {
      const length = +vars['--lp-length'];
      const offset = +vars['--lp-off'];
      assert(length >= lp.clientWidth);
      assert(Math.abs((length - offset) / length - percent / 100) < 1e-12);
      assert.equal(vars['--lp-visible'], percent > 0 ? '1' : '0');
      assert(children.every(p => !('pathLength' in p.attrs)));
      // Period 2L keeps the next bright interval outside the entire path.
      assert(2 * length - offset >= length);
      // Stop marker begins exactly where the single active interval ends.
      assert(Math.abs(-(offset - length) - (length - offset)) < 1e-12);
      assert.equal(children[0].attrs.d, children[1].attrs.d);
      assert.equal(children[1].attrs.d, children[2].attrs.d);
    }
    verify();
    const before = +vars['--lp-length'];
    lp.clientWidth = width + 123;
    onResize();
    verify();
    assert(+vars['--lp-length'] > before);
    assert(classes.has('is-resizing'));
    frames.forEach(cb => cb());
    assert(!classes.has('is-resizing'));
    cases++;
  }
}
console.log(`Wavy progress: ${cases} progress/width cases and ${cases} resize cases passed.`);
