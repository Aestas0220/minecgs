(function () {
  "use strict";
  var links = Array.from(document.querySelectorAll(".guide-nav a"));
  var sections = links.map(function (link) { return document.querySelector(link.getAttribute("href")); });
  var pending = false;
  function measureTail() {
    var last = sections[sections.length - 1];
    var shell = document.querySelector(".guide-shell");
    var footer = document.querySelector(".site-footer");
    if (!last || !shell) return;
    var bottom = parseFloat(getComputedStyle(shell).paddingBottom) || 0;
    var margin = parseFloat(getComputedStyle(last).marginBottom) || 0;
    var tail = Math.max(0, window.innerHeight - 96 - last.getBoundingClientRect().height - bottom - margin - (footer ? footer.getBoundingClientRect().height : 0));
    document.documentElement.style.setProperty("--guide-tail-space", Math.ceil(tail) + "px");
  }
  function update() {
    pending = false;
    var active = 0;
    sections.forEach(function (section, index) {
      if (section.getBoundingClientRect().top <= 180) active = index;
    });
    links.forEach(function (link, index) {
      if (index === active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", function () {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }, { passive: true });
  measureTail();
  update();
  window.addEventListener("resize", measureTail, { passive: true });
  if (document.fonts) document.fonts.ready.then(measureTail);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(measureTail).observe(sections[sections.length - 1]);
  links.forEach(function (link, index) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      sections[index].scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      history.replaceState(null, "", link.getAttribute("href"));
    });
  });
  document.addEventListener("minecgs:languagechange", function () {
    document.title = window.MineCGSI18n.t("安装指南 · MineCGS");
    measureTail();
  });
  document.title = window.MineCGSI18n.t("安装指南 · MineCGS");
  document.documentElement.setAttribute("data-guide-ready", "true");
})();
