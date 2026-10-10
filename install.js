(function () {
  "use strict";
  var links = Array.from(document.querySelectorAll(".guide-nav a"));
  var sections = links.map(function (link) { return document.querySelector(link.getAttribute("href")); });
  var pending = false;
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
  update();
  links.forEach(function (link, index) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      sections[index].scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      history.replaceState(null, "", link.getAttribute("href"));
    });
  });
  document.addEventListener("minecgs:languagechange", function () {
    document.title = window.MineCGSI18n.t("安装指南 · MineCGS");
  });
  document.title = window.MineCGSI18n.t("安装指南 · MineCGS");
  document.documentElement.setAttribute("data-guide-ready", "true");
})();
