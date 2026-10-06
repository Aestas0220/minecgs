const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
const start = source.indexOf('    /* —— MD3 Wavy Linear Progress：');
const end = source.indexOf('    /* —— 建造清单折叠面板', start);
const code = source.slice(start, source.indexOf('    /* —— 地图全屏键', end));
assert(start >= 0 && end > start);
assert(!/stroke-dash|pathLength|getTotalLength/.test(code.replace(/\/\*[\s\S]*?\*\//g, '')));
let checks = 0;
for (const width of [320, 768, 1024, 1366]) {
  for (const value of ['0%', '15%', '50%', '100%', '-5%', '120%', 'invalid']) {
    for (const reduced of [false, true]) {
      let resize, mutation, visible = false, frameId = 0, now = 0;
      const frames = new Map(), children = [];
      const lp = { clientWidth: width, closest: () => card, querySelector: () => svg };
      const card = { classList: { contains: () => visible } };
      const svg = { setAttribute() {}, appendChild: el => children.push(el) };
      let toggleChecklist;
      const checklistClasses = new Set();
      const trigger = { attrs: {}, addEventListener(event, cb) { if (event === 'click') toggleChecklist = cb; }, setAttribute(k,v) { this.attrs[k] = v; } };
      const checklist = {
        querySelector: () => trigger,
        classList: {
          contains: c => checklistClasses.has(c),
          toggle(c,on) { if (on) checklistClasses.add(c); else checklistClasses.delete(c); },
        },
      };
      vm.runInNewContext(code, {
        window: { matchMedia: () => ({ matches: reduced }) },
        document: { querySelector: selector => selector === '.clp' ? checklist : lp, createElementNS: (ns, tag) => ({ tag, attrs: {}, style: {}, setAttribute(k,v) { this.attrs[k] = v; } }) },
        getComputedStyle: () => ({ getPropertyValue: k => ({ '--lp-value': value, '--md-linear-progress-wave-amplitude': '2.5px', '--md-linear-progress-wave-length': '16px', '--md-linear-progress-track-height': '4px', '--md-linear-progress-stop-indicator-size': '8px', '--md-sys-motion-duration-medium3': '350ms' })[k] }),
        MutationObserver: function(cb) { mutation = cb; this.observe = () => {}; },
        ResizeObserver: function(cb) { resize = cb; this.observe = () => {}; },
        requestAnimationFrame: cb => { frames.set(++frameId, cb); return frameId; },
        cancelAnimationFrame: id => frames.delete(id),
      });
      assert.equal(typeof toggleChecklist, 'function', 'progress initialization must not prevent checklist binding');
      toggleChecklist();
      assert(checklistClasses.has('is-open'));
      assert.equal(trigger.attrs['aria-expanded'], 'true');
      toggleChecklist();
      assert(!checklistClasses.has('is-open'));
      assert.equal(trigger.attrs['aria-expanded'], 'false');
      const parsed = parseFloat(value);
      const percent = Number.isFinite(parsed) ? Math.max(0,Math.min(100,parsed)) : 15;
      const active = children[1], stop = children[2];
      assert.equal(stop.tag, 'circle');
      assert.equal(active.style.opacity, '0');
      visible = true; mutation();
      let previousX = 0;
      function verifyFrame() {
        const coords = active.attrs.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
        const x = coords.at(-2), y = coords.at(-1);
        assert(x >= previousX && x <= lp.clientWidth * percent / 100 + 0.01);
        assert.equal(+stop.attrs.cx, x);
        assert.equal(+stop.attrs.cy, y);
        assert.equal((active.attrs.d.match(/M/g) || []).length, 1);
        for (let i=2; i<coords.length; i+=2) assert(coords[i] >= coords[i-2]);
        previousX = x;
      }
      while (frames.size) {
        assert(now < 1000, 'animation must stop');
        const pending = [...frames.values()]; frames.clear();
        pending.forEach(cb => cb(now)); now += 16; verifyFrame();
      }
      verifyFrame();
      assert(Math.abs(+stop.attrs.cx - width * percent / 100) <= 0.01);
      lp.clientWidth = width + 123; previousX = 0; resize(); verifyFrame();
      assert(Math.abs(+stop.attrs.cx - lp.clientWidth * percent / 100) <= 0.01);
      visible = false; mutation();
      assert.equal(active.style.opacity,'0'); assert.equal(stop.style.opacity,'0');
      assert.equal(frames.size,0);
      checks++;
    }
  }
}
console.log('Wavy progress:', checks, 'cases passed: continuous prefix, animation frames, resize, zero/full progress, reduced motion, hide.');
