/* Opt-in iPad layer diagnosis; never loaded during ordinary visits. */
(function () {
  "use strict";
  if (new URLSearchParams(window.location.search).get("diagnose") !== "layers") return;
  var style = document.createElement("style");
  style.textContent =
    "html{background:#ffff00!important}" +
    "body{background:#00ffff!important}" +
    ".site-footer{background:#ff00ff!important}" +
    ".page-bg__image{background-image:none!important;background-color:#00ff00!important}";
  document.head.appendChild(style);
  var panel = document.createElement("pre");
  panel.style.cssText = "position:fixed;top:calc(90px + env(safe-area-inset-top,0px));left:12px;z-index:1000;margin:0;padding:10px;border-radius:8px;background:#000;color:#fff;font:12px/1.5 monospace;pointer-events:none;white-space:pre-wrap;max-width:calc(100vw - 24px)";
  panel.setAttribute("aria-label", "背景层诊断");
  document.body.appendChild(panel);
  var probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;height:100lvh;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(probe);
  var pending = false;
  function round(v) { return Math.round(v * 10) / 10; }
  function bounds(selector) {
    var el = document.querySelector(selector);
    if (!el) return "missing";
    var r = el.getBoundingClientRect();
    return round(r.top) + ".." + round(r.bottom);
  }
  function update() {
    pending = false;
    var vv = window.visualViewport;
    var cs = getComputedStyle(probe);
    panel.textContent = "诊断 v94：请录下接缝或底边色带\n" +
      "紫=Footer  青=body  黄=html  绿=固定背景\n" +
      "innerH=" + window.innerHeight + " clientH=" + document.documentElement.clientHeight + "\n" +
      "visualH=" + (vv ? round(vv.height) : "n/a") + " offsetTop=" + (vv ? round(vv.offsetTop) : "n/a") + "\n" +
      "lvh=" + cs.height + " safeBottom=" + cs.paddingBottom + "\n" +
      "背景 top..bottom=" + bounds(".page-bg") + "\n" +
      "内容 top..bottom=" + bounds(".page-sheet") + "\n" +
      "Footer top..bottom=" + bounds(".site-footer") + "\n" +
      "scrollY=" + round(window.scrollY);
  }
  function schedule() {
    if (!pending) { pending = true; window.requestAnimationFrame(update); }
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", schedule, { passive: true });
    window.visualViewport.addEventListener("scroll", schedule, { passive: true });
  }
  update();
})();
