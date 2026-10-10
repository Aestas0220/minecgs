    (function () {
      "use strict";

      var root = document.documentElement;
      function translate(source, parameters) {
        return window.MineCGSI18n ? window.MineCGSI18n.t(source, parameters) : source;
      }
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* ============================================================
         0. 背景几何物理像素对齐（78 轮，撕裂修复三版）
         --page-bg-size/pos 的 CSS 公式（vw/vh 组合）在分数 DPR 设备上
         产生非整数物理像素 —— 典型如小米平板 7 Ultra：3200×2136 @DPR3
         → CSS 视口 1066.67px，背景图几何落点 6151.68px / -128.16px
         全是浮点；大图光栅化被迫线性过滤重采样，滚动/重绘期反复重算
         这个浮点对齐 —— 同 SOC 整数视口手机（小米 15S Pro 480px 宽）
         与整数网格桌面无此路径，故撕裂为该类设备独有。JS 把宽/高/偏移
         四舍五入到 1/DPR 网格（物理像素整数）后注入变量：光栅化落点
         整数对齐、滚动期纯整数 blit；CSS 公式（83 轮已 vh→svh）保留作
         无 JS 兜底；.hero__bg / .page-bg 共享同变量，对齐后两层像素
         重合不变。
         使用实际 100svh 测量值：桌面窗口改宽/高均重新适配，移动端
         地址栏收起/展开不改变小视口高度，转屏和分屏仍会重新计算。
         只有缺少 svh 支持的旧触屏浏览器继续使用宽度变化时重置高度
         的兜底。三个背景层仍共享同一组几何，禁止各自移动。 */
      (function alignPageBg() {
        var lastW = 0, lastH = 0, lastDpr = 0, fallbackH = 0;
        var frame = 0;
        var touchViewport = window.matchMedia("(hover: none) and (pointer: coarse)");
        var viewportProbe = null;
        if (window.CSS && CSS.supports("height", "100svh")) {
          viewportProbe = document.createElement("div");
          viewportProbe.setAttribute("aria-hidden", "true");
          viewportProbe.style.cssText = "position:absolute;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none;";
          document.body.appendChild(viewportProbe);
        }
        function align() {
          frame = 0;
          var dpr = window.devicePixelRatio || 1;
          var W = window.innerWidth;
          var H = window.innerHeight;
          if (viewportProbe) { H = viewportProbe.getBoundingClientRect().height; }
          else if (touchViewport.matches) {
            if (!fallbackH || W !== lastW) { fallbackH = H; }
            H = fallbackH;
          }
          if (W === lastW && H === lastH && dpr === lastDpr) { return; }
          lastW = W; lastH = H; lastDpr = dpr;
          var imageRatio = 2522 / 1410;
          var wCss = Math.max(W * 1.08, H * 1.08 * imageRatio);
          var hCss = wCss / imageRatio;
          var xCss = (W - wCss) / 2;                 /* = 50% 背景定位 */
          var yCss = H * 0.446 - hCss * 0.45;        /* = 44.6svh - 0.45h（与 CSS max 形式解析等价） */
          var q = function (v) { return Math.round(v * dpr) / dpr; };
          root.style.setProperty("--page-bg-size", q(wCss) + "px " + q(hCss) + "px");
          root.style.setProperty("--page-bg-pos", q(xCss) + "px " + q(yCss) + "px");
        }
        function requestAlign() {
          if (!frame) { frame = window.requestAnimationFrame(align); }
        }
        align();
        window.addEventListener("resize", requestAlign, { passive: true });
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", requestAlign, { passive: true });
        }
      })();

      /* ============================================================
         1. Dynamic Color —— 谷歌 Material Color Utilities 官方流水线
         （主题源色固定 = 用户指定品牌色，不随主图漂移）
           THEME_SOURCE（砖红 #B4552F，2026-10-05 用户定案）
           -> TonalPalette.fromHueAndChroma 六色板（TonalSpot 语义
              P36/S16/T+60,24/N10/NV14/E25,84）
           -> DynamicScheme + MaterialDynamicColors -> 36 角色
           -> #dynamic-theme 注入。角色 tone 严格取 MCU 标准 TonalSpot
              真值表（contrastLevel 0），零手写偏移。
         旧运行时取色管线（canvas 抽样取色）已随源色固定退役
         —— 加载路径零采样开销。CSS Layer 0/1 静态
         兜底与 THEME_SOURCE 同源生成（r70_reseed.js 逐值断言）。
         ============================================================ */
      /* Sample the actual crop beneath each hero text group, including the scrim.
         No scroll listener or persistent animation loop is needed. */
      (function adaptiveHeroInk() {
        var bg = document.querySelector(".hero__bg");
        var groups = [document.querySelector(".hero h1"), document.querySelector(".hero__subtitle"), document.querySelector(".language-switch")].filter(Boolean);
        if (!bg || !groups.length) return;
        var canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        var ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        var image = new Image(), ready = false, frame = 0, geometry = "";
        function linear(channel) {
          channel /= 255;
          return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
        }
        function update() {
          frame = 0;
          if (!ready) return;
          var cs = getComputedStyle(bg), bounds = bg.getBoundingClientRect();
          var size = cs.backgroundSize.split(" "), pos = cs.backgroundPosition.split(" ");
          var w = parseFloat(size[0]), h = size[1] === "auto" ? w * image.naturalHeight / image.naturalWidth : parseFloat(size[1]);
          var x = pos[0].includes("%") ? (bounds.width - w) * parseFloat(pos[0]) / 100 : parseFloat(pos[0]);
          var y = pos[1].includes("%") ? (bounds.height - h) * parseFloat(pos[1]) / 100 : parseFloat(pos[1]);
          if (!(w > 0 && h > 0 && bounds.height > 0)) return;
          var stops = [[0, .60], [.28, .30], [.52, .12], [.76, .22], [1, .48]];
          groups.forEach(function (group) {
            var boxes;
            if (group.classList.contains("language-switch")) {
              boxes = Array.from(group.querySelectorAll(".language-switch__choice")).map(function (el) { return el.getBoundingClientRect(); });
            } else {
              var range = document.createRange(); range.selectNodeContents(group);
              boxes = Array.from(range.getClientRects());
            }
            var total = 0, count = 0;
            try {
              boxes.forEach(function (box) {
                if (!box.width || !box.height) return;
                for (var row = 0; row < 4; row++) for (var col = 0; col < 16; col++) {
                  var px = box.left - bounds.left + box.width * (col + .5) / 16;
                  var py = box.top - bounds.top + box.height * (row + .5) / 4;
                  var sx = (px - x) / w * image.naturalWidth, sy = (py - y) / h * image.naturalHeight;
                  var rgb = [18, 14, 8];
                  if (sx >= 0 && sy >= 0 && sx < image.naturalWidth && sy < image.naturalHeight) {
                    ctx.clearRect(0, 0, 1, 1);
                    ctx.drawImage(image, sx, sy, 1, 1, 0, 0, 1, 1);
                    rgb = ctx.getImageData(0, 0, 1, 1).data;
                  }
                  var vertical = Math.max(0, Math.min(1, py / bounds.height)), alpha = .48;
                  for (var i = 1; i < stops.length; i++) if (vertical <= stops[i][0]) {
                    var fraction = (vertical - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
                    alpha = stops[i - 1][1] + fraction * (stops[i][1] - stops[i - 1][1]); break;
                  }
                  var radial = Math.sqrt(Math.pow((px / bounds.width - .5) / .88, 2) + Math.pow((py / bounds.height - .30) / .58, 2));
                  var radialAlpha = Math.max(0, Math.min(1, (radial - .46) / .54)) * .34;
                  var channels = [18, 14, 8].map(function (shade, channel) {
                    var under = rgb[channel] * (1 - radialAlpha) + [14, 10, 5][channel] * radialAlpha;
                    return linear(under * (1 - alpha) + shade * alpha);
                  });
                  total += .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]; count++;
                }
              });
            } catch (error) { return; } // Preserve readable CSS fallback if sampling is unavailable.
            if (!count) return;
            var dark = total / count > .179;
            group.style.setProperty("--hero-ink", dark ? "#000000" : "#ffffff");
            group.style.setProperty("--hero-ink-shadow", dark ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.42)");
          });
        }
        function schedule() { if (!frame) frame = requestAnimationFrame(update); }
        image.onload = function () { ready = true; schedule(); };
        var url = getComputedStyle(bg).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
        if (url) image.src = url[1];
        window.addEventListener("resize", schedule, { passive: true });
        document.addEventListener("minecgs:languagechange", schedule);
        if (window.visualViewport) window.visualViewport.addEventListener("resize", schedule, { passive: true });
        if (document.fonts) document.fonts.ready.then(schedule);
        if (typeof ResizeObserver !== "undefined") {
          var observer = new ResizeObserver(schedule); groups.forEach(function (group) { observer.observe(group); });
        }
        new MutationObserver(function () {
          var next = root.style.getPropertyValue("--page-bg-size") + root.style.getPropertyValue("--page-bg-pos");
          if (next !== geometry) { geometry = next; schedule(); }
        }).observe(root, { attributes: true, attributeFilter: ["style"] });
      })();
      var THEME_SOURCE = 0xffB4552F;
      var ROLES = [
        "primary", "onPrimary", "primaryContainer", "onPrimaryContainer",
        "secondary", "onSecondary", "secondaryContainer", "onSecondaryContainer",
        "tertiary", "onTertiary", "tertiaryContainer", "onTertiaryContainer",
        "error", "onError", "errorContainer", "onErrorContainer",
        "background", "onBackground",
        "surface", "onSurface", "surfaceVariant", "onSurfaceVariant",
        "surfaceDim", "surfaceBright", "surfaceContainerLowest", "surfaceContainerLow",
        "surfaceContainer", "surfaceContainerHigh", "surfaceContainerHighest",
        "outline", "outlineVariant", "shadow", "scrim",
        "inverseSurface", "inverseOnSurface", "inversePrimary"
      ];

      function roleToVar(name) {
        return "--md-sys-color-" + name.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); });
      }

      function argbToHex(argb) {
        var v = (argb & 0xFFFFFF).toString(16);
        while (v.length < 6) { v = "0" + v; }
        return "#" + v;
      }

      function extractRoles(scheme) {
        var out = {};
        ROLES.forEach(function (name) {
          var dc = MCU.MaterialDynamicColors[name];
          if (dc && typeof dc.getArgb === "function") {
            out[roleToVar(name)] = argbToHex(dc.getArgb(scheme));
          }
        });
        return out;
      }

      /* —— 色阶生成：取色种子 -> 浅/深两套 36 角色 ——
         角色值直接取自 MCU 标准 tone 映射（与 _gen51_layer.js
         LIGHT_MAP/DARK_MAP 真值表逐值一致），不做任何层级偏移 */
      function buildThemes(seedArgb) {
        var hct = MCU.Hct.fromInt(seedArgb);
        function P(h, c) { return MCU.TonalPalette.fromHueAndChroma(h, c); }
        var neutral = P(hct.hue, 10), nvar = P(hct.hue, 14);
        var palettes = {
          primary: P(hct.hue, 36), secondary: P(hct.hue, 16),
          tertiary: P(hct.hue + 60, 24), neutral: neutral,
          neutralVariant: nvar, error: P(25, 84)
        };
        function mk(isDark) {
          return new MCU.DynamicScheme({
            sourceColorHct: hct,
            variant: MCU.Variant.TONAL_SPOT,
            isDark: isDark,
            contrastLevel: 0,
            primaryPalette: palettes.primary,
            secondaryPalette: palettes.secondary,
            tertiaryPalette: palettes.tertiary,
            neutralPalette: neutral,
            neutralVariantPalette: nvar,
            errorPalette: palettes.error
          });
        }
        var lightVars = extractRoles(mk(false));
        var darkVars = extractRoles(mk(true));
        return { light: lightVars, dark: darkVars, palettes: palettes };
      }

      /* 由种子色生成 light/dark 两套角色并写入样式表 */
      function applyDynamicColor(seedArgb) {
        var themes = buildThemes(seedArgb);

        function block(vars) {
          return Object.keys(vars).map(function (k) { return k + ":" + vars[k] + ";"; }).join("");
        }

        var style = document.getElementById("dynamic-theme");
        if (!style) {
          style = document.createElement("style");
          style.id = "dynamic-theme";
          document.head.appendChild(style);
        }
        style.textContent =
          ":root{" + block(themes.light) + "}" +
          '[data-theme="dark"]{' + block(themes.dark) + "}";

        try { localStorage.setItem("gcgs-mc-seed", String(seedArgb)); } catch (e) {}
        /* 导出口：CSS Layer 0/1 静态兜底由此同源生成（勿删） */
        window.__mcTheme = { seed: seedArgb, light: themes.light, dark: themes.dark, palettes: themes.palettes };
      }

      /* 主题源色固定直达 buildThemes（旧 canvas 抽样取色管线已退役：
         THEME_SOURCE 恒定，采样无消费方，删去省一条 3840x2160 全图
         读像素热路径） */
      if (window.MCU && MCU.MaterialDynamicColors) {
        applyDynamicColor(THEME_SOURCE);
      }

      /* ============================================================
         2. 深浅色切换（MD3 全局角色过渡）
         ============================================================ */
      var themeToggle = document.getElementById("themeToggle");

      /* 主题切换 = 全页一次性同步渐变（76 轮分级动画架构，覆盖 71 轮
         单一 CSS 过渡实现）：
         ① View Transitions API 优先 —— 旧/新状态各拍一张整页快照，由
            合成器做 GPU 纹理 crossfade：切换期间零逐元素动画、零逐帧
            重绘，物理上不存在安卓合成器丢层（撕裂=层瞬时缺失露出下层，
            模糊背景/卡片/文字都可能是丢层现场，故治本=不给合成器制造
            逐元素动画压力）；
         ② 无 VT 的桌面浏览器 —— 挂 is-theme-shifting 的 CSS 全页渐变
            （桌面合成器从无撕裂，维持既有体验）；
         ③ 无 VT 的安卓 WebView / reduce-motion —— 瞬时同步硬切（无渐变
            但绝不撕裂；瞬时全页同帧变化仍属"一次性同步"，禁分批）。
         初始套色一律直接落定（无过渡）。 */
      var canVT = typeof document.startViewTransition === "function";
      var isAndroid = /Android/i.test(navigator.userAgent || "");
      var shiftTimer = null;
      var vtGen = 0;   /* 落定令牌：快速连点时只让最新一次 VT 摘除落定层 */
      function updateThemeLabel() {
        if (!themeToggle) return;
        var label = translate(root.getAttribute("data-theme") === "dark" ? "切换为浅色模式" : "切换为深色模式");
        themeToggle.setAttribute("aria-label", label);
        themeToggle.setAttribute("title", label);
      }
      document.addEventListener("minecgs:languagechange", updateThemeLabel);
      function applyTheme(theme, animate) {
        function commit() {
          root.setAttribute("data-theme", theme);
          if (themeToggle) {
            var label = translate(theme === "dark" ? "切换为浅色模式" : "切换为深色模式");
            themeToggle.setAttribute("aria-label", label);
            themeToggle.setAttribute("title", label);
          }
        }
        if (animate && !reduceMotion && canVT) {
          /* 路径①：快照 crossfade（期间不挂 is-theme-shifting）。
             🔴 79 轮：is-vt-landing 让全部色面过渡瞬时落定进新快照 ——
             补全 76 轮 veil 原则：若卡片等大面积色面仍走 --theme-shift
             插值，VT 新快照会捕获到过渡起始帧（≈旧色），crossfade 两端
             同色、落幕瞬间整页弹出新主题（卡片区闪烁的根源）。渐变
             100% 由快照 GPU 混合承担；opacity/transform 过渡保留，
             reveal 上浮不受影响。落定层维持到 crossfade 结束（finished），
             保证落幕帧露出的活页即终值 */
          if (shiftTimer) { window.clearTimeout(shiftTimer); shiftTimer = null; }
          root.classList.add("is-vt-landing");
          var gen = ++vtGen;
          var land = function () {
            if (gen === vtGen) { root.classList.remove("is-vt-landing"); }
          };
          var vt = document.startViewTransition(commit);
          if (vt && vt.finished && typeof vt.finished.then === "function") {
            vt.finished.then(land, land);   /* 跳过/中断同样摘除 */
          } else {
            window.setTimeout(land, 400);   /* 兜底：跨淡变时长上限 */
          }
          return;
        }
        commit();
        if (animate && !reduceMotion && !isAndroid) {
          /* 路径②：CSS 全页渐变（桌面降级） */
          root.classList.add("is-theme-shifting");
          if (shiftTimer) window.clearTimeout(shiftTimer);
          shiftTimer = window.setTimeout(function () {
            root.classList.remove("is-theme-shifting");
            shiftTimer = null;
          }, 340);
        }
        /* 路径③：硬切（安卓无 VT / reduce-motion / 初始套色） */
      }

      var savedTheme = null;
      try { savedTheme = localStorage.getItem("gcgs-theme"); } catch (e) {}
      var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : (systemDark ? "dark" : "light"));

      if (themeToggle) {
        themeToggle.addEventListener("click", function () {
          var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
          applyTheme(next, true);
          try { localStorage.setItem("gcgs-theme", next); } catch (e) {}
        });
      }

      /* ============================================================
         3. Top App Bar 滚动态（MD3：滚动后 surface-container + elevation 2）
         ============================================================ */
      if (root.getAttribute("data-page") === "install") return;
      var topBar = document.getElementById("topBar");
      var barScrolled = false;
      function updateBar() {
        if (!topBar) return;
        var s = (window.scrollY || 0) > 8;
        if (s !== barScrolled) { barScrolled = s; topBar.classList.toggle("is-scrolled", s); }
      }
      window.addEventListener("scroll", updateBar, { passive: true });
      updateBar();

      /* ------------------------------------------------------------
         品牌自适应：顶栏宽度不足以同时容纳品牌 + tabs + 主题键时，
         品牌整体隐去；宽屏桌面完整展示。
         测量式隐藏 —— 不依赖断点，字体加载完成后再校准一次
         ------------------------------------------------------------ */
      (function fitBrand() {
        if (!topBar) return;
        var brand = topBar.querySelector(".brand");
        var tabs = topBar.querySelector(".tabs");
        var toggle = topBar.querySelector(".theme-toggle");
        if (!brand || !tabs || !toggle) return;
        function measure() {
          brand.classList.remove("is-hidden");
          var cs = window.getComputedStyle(topBar);
          var avail = topBar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          var needed = brand.offsetWidth + tabs.offsetWidth + toggle.offsetWidth + 24;
          if (needed > avail) { brand.classList.add("is-hidden"); }
        }
        measure();
        window.addEventListener("resize", measure, { passive: true });
        document.addEventListener("minecgs:languagechange", measure);
        if (document.fonts && document.fonts.ready) { document.fonts.ready.then(measure); }
      })();

      /* ------------------------------------------------------------
         版权行：项目年份区间 —— 首年 2024（动工年）固定，
         末年取真实当前年份自动更新，无需改文件
         ------------------------------------------------------------ */
      (function updateCopyright() {
        var el = document.getElementById("copyright");
        if (!el) return;
        var year = new Date().getFullYear();
        el.textContent = year > 2024 ? "@2024-" + year + " by Aestatis & LED" : "@2024 by Aestatis & LED";
      })();

      /* ============================================================
         4. 滚动监听 —— Intersection Observer 上浮淡入
         ============================================================ */
      var revealEls = document.querySelectorAll(".reveal");
      if ("IntersectionObserver" in window && !reduceMotion) {
        var revealIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            /* 方向敏感的可重复触发：
               · 从下边缘进/出（下滑新内容上浮淡入；上滑返回时下浮收回原位）
               · 上边缘进出（上方旧卡片）不动 —— 到达过的内容永不再播入场
               判据：顶边在视口之上 = 旧卡片，保持可见 */
            var seenFromTop = entry.boundingClientRect.top < 0;
            entry.target.classList.toggle("is-visible", entry.isIntersecting || seenFromTop);
          });
        }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
        revealEls.forEach(function (el) { revealIO.observe(el); });
      } else {
        revealEls.forEach(function (el) { el.classList.add("is-visible"); });
      }

      /* ============================================================
         5. MD3 Primary Tabs —— 单一滚动判定激活当前区块
         所有状态变更走唯一出口 setActive()，输入源分两路：
         · 滚动：检测线（视口 50% 处）落在哪个区段哪个激活，区界 20px 迟滞；
           hero 钉住 rect 恒在视口顶须特殊取 0，其余 rect.top+scrollY 稳定坐标
         · 点击：jumpToSection 非线性缓动接管跳转（84 轮，hero 回顶
           特判，pushState 同步 hash）；程序化跳转期间抑制滚动判定
           （suppressNavScroll），滚动停 280ms 后解除并重同步 ——
           平滑滚动路过中间区段时不会逐个翻 tab
         指示器动画只用 left/width 过渡（禁横向缩放伪影）
         ============================================================ */
      var tabsEl = document.getElementById("tabs");
      var tabsIndicator = document.getElementById("tabsIndicator");
      var tabLinks = Array.prototype.slice.call(document.querySelectorAll(".tabs__tab[data-section]"));
      var navSections = ["hero", "intro", "progress", "join"].map(function (id) {
        return { id: id, el: document.getElementById(id) };
      }).filter(function (s) { return s.el; });
      var navTops = [];
      var navActiveIdx = 0;
      var navGeom = [];            /* 各 tab 指示器几何 {left,width}（相对 .tabs，与 navSections 同序） */
      var navSuppress = false;
      var navSuppressTimer = 0;
      var IND_MAX = 32;            /* MD3 primary tab 指示器宽 32dp */

      function tabOfSection(id) {
        for (var i = 0; i < tabLinks.length; i++) {
          if (tabLinks[i].getAttribute("data-section") === id) { return tabLinks[i]; }
        }
        return null;
      }

      function measureNav() {
        var sy = window.scrollY || 0;
        navTops = navSections.map(function (s) {
          /* hero 钉住（sticky）rect 恒在视口顶，须特殊取 0；
             其余区段正常流，rect.top + scrollY = 稳定文档坐标 */
          return s.id === "hero" ? 0 : s.el.getBoundingClientRect().top + sy;
        });
      }

      /* 指示器几何：32dp 居中于 tab 下缘（tab 过窄时按可用宽收缩） */
      function measureTabs() {
        navGeom = navSections.map(function (s) {
          var link = tabOfSection(s.id);
          if (!link) { return { left: 0, width: 0 }; }
          var w = Math.min(IND_MAX, link.offsetWidth);
          return { left: link.offsetLeft + (link.offsetWidth - w) / 2, width: w };
        });
      }
      function geomOfIdx(i) { return navGeom[i] || { left: 0, width: 0 }; }

      function placeIndicator(g, instant) {
        if (!tabsIndicator) { return; }
        if (instant) { tabsIndicator.classList.add("is-anim-off"); }
        tabsIndicator.style.left = g.left + "px";
        tabsIndicator.style.width = g.width + "px";
        if (instant) {
          void tabsIndicator.offsetWidth;   /* 回流锁定：瞬时就位，不播过渡 */
          tabsIndicator.classList.remove("is-anim-off");
        }
      }

      /* 唯一状态出口：instant=true 时指示器瞬时就位（初始化/重排） */
      function setActive(idx, instant) {
        if (!navSections[idx] || idx === navActiveIdx) { return; }
        navActiveIdx = idx;
        var activeId = navSections[navActiveIdx].id;
        tabLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("data-section") === activeId);
        });
        placeIndicator(geomOfIdx(navActiveIdx), !!instant);
      }

      function suppressNavScroll() {
        navSuppress = true;
        if (navSuppressTimer) { clearTimeout(navSuppressTimer); }
        navSuppressTimer = setTimeout(function () {
          navSuppress = false;
          updateNav(window.scrollY || 0);   /* 解除即重同步 */
        }, 280);
      }

      /* ============================================================
         84 轮：页面滚动非线性缓动引擎 —— 自写 rAF easeInOutCubic
         （起止零速、中段加速，典型非线性观感）接管 tab/锚点跳转，
         替换浏览器原生 smooth 的生硬匀速。时长按滚动距离自适应：
         clamp(450, 450 + 距离 * 0.25, 900) 毫秒 —— 远距离不拖沓、
         短距离不突兀。落点 = rect.top + scrollY 再按 CSS
         scroll-margin-top 修正（与原生锚点落点一致），hero 回顶
         特判 0；prefers-reduced-motion 直接瞬时跳转；新跳转先
         取消进行中的旧动画再起新动画
         ============================================================ */
      var scrollAnimRaf = 0;   /* 进行中的滚动动画帧 id（0 = 无） */

      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      /* 逐帧落点：behavior "instant" 绕过 html 的 scroll-behavior: smooth
         （"auto" 会继承 CSS 平滑，逐帧目标被二次插值失真）；
         老浏览器不识别 instant 枚举时回退两参形式 */
      function scrollInstantTo(y) {
        try {
          window.scrollTo({ top: y, behavior: "instant" });
        } catch (err) {
          window.scrollTo(0, y);
        }
      }

      function jumpToSection(id) {
        if (scrollAnimRaf) { cancelAnimationFrame(scrollAnimRaf); scrollAnimRaf = 0; }

        /* 目标位置：hero 回顶特判 0；其余 rect.top + scrollY 按
           scroll-margin-top 修正；再 clamp 进合法滚动域 */
        var targetY = 0;
        if (id !== "hero") {
          var el = document.getElementById(id);
          if (!el) { return; }
          var rect = el.getBoundingClientRect();
          var margin = parseFloat(window.getComputedStyle(el).scrollMarginTop) || 0;
          targetY = rect.top + (window.scrollY || 0) - margin;
        }
        var maxScroll = Math.max(0, (document.documentElement.scrollHeight || 0) - window.innerHeight);
        if (targetY > maxScroll) { targetY = maxScroll; }
        if (targetY < 0) { targetY = 0; }

        suppressNavScroll();   /* 滚动开始即抑制 tab 判定 */
        var startY = window.scrollY || 0;
        var dist = targetY - startY;
        if (reduceMotion || dist === 0) {
          scrollInstantTo(targetY);
          suppressNavScroll();   /* 完成即续期，覆盖停稳后 280ms 迟滞 */
          return;
        }

        var dur = Math.min(900, Math.max(450, 450 + Math.abs(dist) * 0.25));
        var startTime = 0;
        function stepScroll(ts) {
          if (!startTime) { startTime = ts; }
          var t = Math.min((ts - startTime) / dur, 1);
          scrollInstantTo(startY + dist * easeInOutCubic(t));
          if (t < 1) {
            scrollAnimRaf = requestAnimationFrame(stepScroll);
          } else {
            scrollAnimRaf = 0;
            scrollInstantTo(targetY);   /* 落点精确对齐 */
            suppressNavScroll();        /* 完成回调续期：280ms 定时器重置，覆盖停稳迟滞 */
          }
        }
        scrollAnimRaf = requestAnimationFrame(stepScroll);
      }

      function updateNav(y) {
        if (navSuppress) { return; }
        if (navTops.length !== navSections.length) { measureNav(); }
        var line = y + window.innerHeight * 0.5;
        var rawIdx = 0;
        for (var i = 0; i < navTops.length; i++) {
          if (navTops[i] <= line) { rawIdx = i; } else { break; }
        }
        if (rawIdx === navActiveIdx) { return; }
        var past = rawIdx > navActiveIdx ? line - navTops[rawIdx] : navTops[navActiveIdx] - line;
        if (past <= 20) { return; }   /* 区界 20px 迟滞 */
        setActive(rawIdx, false);
      }

      /* tab 点击：接管原生锚点（84 轮）—— preventDefault 后走
         jumpToSection 非线性缓动滚动，pushState 同步 hash 保 URL
         可分享；跳转飞行期间抑制滚动判定，防中途翻 tab 抖动 */
      tabLinks.forEach(function (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          var id = link.getAttribute("data-section");
          for (var i = 0; i < navSections.length; i++) {
            if (navSections[i].id === id) { setActive(i, false); break; }
          }
          jumpToSection(id);
          if (window.history && window.history.pushState) { window.history.pushState(null, "", "#" + id); }
        });
      });

      /* 布局漂移（字体交换/图片落位/主题切换尺寸变化）→ 重测区段坐标
         与 tab 几何；只读 rect 不写布局，无反馈回路 */
      if ("ResizeObserver" in window && document.body) {
        new ResizeObserver(function () { measureNav(); }).observe(document.body);
      }
      if ("ResizeObserver" in window && tabsEl) {
        new ResizeObserver(function () {
          measureTabs();
          placeIndicator(geomOfIdx(navActiveIdx), true);   /* 重排后瞬时就位 */
        }).observe(tabsEl);
      }
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          measureNav(); measureTabs(); placeIndicator(geomOfIdx(navActiveIdx), true);
        });
      }
      document.addEventListener("minecgs:languagechange", function () {
        window.requestAnimationFrame(function () {
          measureNav(); measureTabs(); placeIndicator(geomOfIdx(navActiveIdx), true);
        });
      });
      measureTabs();
      placeIndicator(geomOfIdx(navActiveIdx), true);   /* 初始就位（零动画） */

      /* 钉住封面的 rect 永远停在视口顶，锚点跳转会误判
         "已在视口内"而不滚动 —— #hero（品牌 LOGO / 首屏 tab）走
         jumpToSection 回顶特判（84 轮：非线性缓动回顶） */
      Array.prototype.forEach.call(document.querySelectorAll('a[href="#hero"]'), function (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          jumpToSection("hero");
          if (window.history && window.history.pushState) { window.history.pushState(null, "", "#hero"); }
        });
      });

      /* ============================================================
         6. 封面交接（滚动联动）—— 圆角下页滑过覆盖
           · 封面钉住零平移，照片自始至终保持原图 —— 不做任何
             淡出/位移/缩放/模糊（下页自带烘焙模糊背景，物理覆盖）
           · scroll-hint 先行淡出；品牌标签与 FAB 按阈值迟滞显隐
         ============================================================ */
      var heroSection = document.getElementById("hero");
      var scrollHint = document.querySelector(".scroll-hint");
      var brandEl = document.querySelector(".top-bar .brand");
      var brandShown = false;    /* 左上 logo badge：hero 区隐藏（.is-away），滚至 intro 浮入出场 */
      var ticking = false;
      var heroH = 0;             /* 缓存 hero 高度 —— 滚动热路径禁读 offsetHeight（强制布局） */
      var hintOpacity = -1;
      /* 接缝统一：.page-bg 给 surface 裁切和 edge 边线/投影共享同一变量
         圆角轮廓 —— --sheet-seam = sheet 顶边的视口 y（iOS WebKit 无
         background-attachment: fixed，此为跨平台等效）。滚动热路径禁读
         offsetTop（强制布局）→ 缓存 + resize/load 重测 */
      var pageBgEl = document.querySelector(".page-bg");
      var sheetEl = document.getElementById("pageSheet");
      var sheetTop = 0;
      var seamLast = null;
      /* Extended FAB「下载进服包」：滚过 hero 封面后自右下浮现（阈值迟滞防临界闪烁）。
         页底 footer 避让 = .fab-dock 纯布局（sticky 被顶起），JS 只管显隐 */
      var fabEl = document.getElementById("fabDownload");
      var fabShown = false;

      function updateParallax() {
        var y = window.scrollY || 0;
        if (navSuppress) { suppressNavScroll(); }   /* 程序化飞行中滚动仍在发生 → 续期抑制 */
        if (heroSection) {
          if (!heroH) { heroH = heroSection.offsetHeight || window.innerHeight; measureNav(); }
          var p = Math.min(Math.max(y / heroH, 0), 1);

          /* 81 轮：接缝 = sheet 顶边视口 y，clamp ≥ -64（28px 圆角推出视口
             即足，更深滚动值恒定零抖动）；值不变不动 style */
          if (pageBgEl && sheetEl) {
            if (!sheetTop) { sheetTop = sheetEl.offsetTop || 0; }
            var seam = sheetTop - y;
            /* 位移落到物理像素网格，避免高 DPR 设备每帧分数像素采样。 */
            var seamDpr = window.devicePixelRatio || 1;
            seam = Math.round(seam * seamDpr) / seamDpr;
            if (seam < -64) { seam = -64; }
            if (seam !== seamLast) {
              seamLast = seam;
              pageBgEl.style.setProperty("--sheet-seam", seam + "px");
            }
          }

          /* 导航激活态：统一滚动位置判定（见上方 updateNav） */
          updateNav(y);

          /* 左上 logo badge：hero 区隐藏，滚至 intro（下页覆盖）带出场
             动画浮入（CSS .is-away 过渡）；阈值迟滞防临界闪烁 */
          if (brandEl) {
            var wantBrand = brandShown ? p > 0.86 : p > 0.92;
            if (wantBrand !== brandShown) {
              brandShown = wantBrand;
              brandEl.classList.toggle("is-away", !brandShown);
            }
          }

          /* Extended FAB「下载进服包」：封面滑过后浮现（0.85 / 0.75 迟滞）。
             页底 footer 避让由 .fab-dock 纯布局负责（sticky 被顶起） */
          if (fabEl) {
            var wantFab = fabShown ? p > 0.75 : p > 0.85;
            if (wantFab !== fabShown) {
              fabShown = wantFab;
              fabEl.classList.toggle("is-shown", fabShown);
            }
          }

          /* 封面照片/字层不做淡出 —— 交接由圆角下页（自带烘焙模糊背景）
             自底部上滑物理覆盖完成 */
          if (!reduceMotion && scrollHint) {
            var ho = Math.max(1 - p * 2.6, 0);      /* 提示先行淡出 */
            if (Math.abs(ho - hintOpacity) > 0.01) { scrollHint.style.opacity = ho.toFixed(3); hintOpacity = ho; }
          }
        }
        ticking = false;
      }

      function requestParallax() {
        if (!ticking) { ticking = true; window.requestAnimationFrame(updateParallax); }
      }
      window.addEventListener("scroll", requestParallax, { passive: true });
      window.addEventListener("resize", function () { heroH = 0; sheetTop = 0; requestParallax(); }, { passive: true });
      window.addEventListener("load", function () { heroH = 0; sheetTop = 0; requestParallax(); });  /* 图片/字体落位后重测 */
      updateParallax();

      /* ============================================================
         7. MD3 Ripple（状态层水波纹）
         ============================================================ */
      document.querySelectorAll(".btn.sl, .theme-toggle.sl, .fab.sl").forEach(function (el) {
        el.addEventListener("click", function (event) {
          if (reduceMotion) return;
          var rect = el.getBoundingClientRect();
          var ripple = document.createElement("span");
          var size = Math.max(rect.width, rect.height);
          ripple.className = "ripple";
          ripple.style.width = ripple.style.height = size + "px";
          ripple.style.left = (event.clientX - rect.left - size / 2) + "px";
          ripple.style.top = (event.clientY - rect.top - size / 2) + "px";
          el.appendChild(ripple);
          window.setTimeout(function () { ripple.remove(); }, 650);
        });
      });

      /* 占位按钮通用拦截：aria-disabled 的链接在地址未定前阻止跳转
         （下载按钮已接入实链 minecgs-modpack.mrpack，不再是占位） */
      document.querySelectorAll('a[aria-disabled="true"]').forEach(function (el) {
        el.addEventListener("click", function (e) { e.preventDefault(); });
      });

      /* ============================================================
         8. 下载确认弹窗（MD3 Basic dialog · 3 秒冷静期倒计时）
         流程：点击下载按钮 → showModal 免责弹窗 → 确认按钮 3 秒禁用
              （aria-live 报秒）→ 到时启用 → 确认后才触发 mrpack 直链下载。
         关闭途径：取消按钮 / Esc（native cancel）/ 点击遮罩。
         ============================================================ */
      var dlBtn = document.getElementById("downloadBtn");
      var dlDlg = document.getElementById("dlDialog");
      var dlConfirm = document.getElementById("dlDlgConfirm");
      var dlCancel = document.getElementById("dlDlgCancel");
      var dlCountdown = document.getElementById("dlDlgCountdown");
      var dlTimer = null;
      var dlSecondsLeft = 3;
      function updateCountdown() {
        if (!dlCountdown) return;
        dlCountdown.textContent = dlSecondsLeft > 0
          ? translate("请阅读以上须知，{seconds} 秒后可确认", { seconds: dlSecondsLeft })
          : translate("倒计时结束，现在可以确认下载");
      }
      document.addEventListener("minecgs:languagechange", function () {
        if (dlDlg && dlDlg.open) updateCountdown();
      });

      function dlStartCountdown() {
        var left = 3;
        dlSecondsLeft = left;
        dlConfirm.disabled = true;
        dlConfirm.setAttribute("aria-disabled", "true");
        updateCountdown();
        window.clearInterval(dlTimer);
        dlTimer = window.setInterval(function () {
          left -= 1;
          dlSecondsLeft = left;
          if (left > 0) {
            updateCountdown();
          } else {
            window.clearInterval(dlTimer);
            dlTimer = null;
            dlConfirm.disabled = false;
            dlConfirm.removeAttribute("aria-disabled");
            updateCountdown();
          }
        }, 1000);
      }

      function dlClose() {
        if (!dlDlg || !dlDlg.open) return;
        window.clearInterval(dlTimer);
        dlTimer = null;
        if (reduceMotion) { dlDlg.close(); return; }
        dlDlg.classList.add("is-closing");
        window.setTimeout(function () {
          dlDlg.classList.remove("is-closing");
          dlDlg.close();
        }, 200); /* 退场 = --md-sys-motion-duration-short4（200ms） */
      }

      if (dlBtn && dlDlg && dlConfirm && dlCancel && dlCountdown) {
        dlBtn.addEventListener("click", function (e) {
          e.preventDefault();
          dlDlg.showModal();
          dlStartCountdown();
        });
        dlCancel.addEventListener("click", dlClose);
        /* Esc / 系统返回：走 native cancel，统一进退场流程 */
        dlDlg.addEventListener("cancel", function (e) {
          e.preventDefault();
          dlClose();
        });
        /* 遮罩点击（事件目标即 dialog 本体）等同取消 */
        dlDlg.addEventListener("click", function (e) {
          if (e.target === dlDlg) dlClose();
        });
        dlConfirm.addEventListener("click", function () {
          if (dlConfirm.disabled) return;
          dlClose();
          /* 临时锚点复刻原始直链下载（保留 download 文件名） */
          var a = document.createElement("a");
          a.href = dlBtn.getAttribute("href");
          a.setAttribute("download", dlBtn.getAttribute("download") || "");
          document.body.appendChild(a);
          a.click();
          a.remove();
        });

        /* Extended FAB「下载进服包」：与 hero 下载按钮同一免责弹窗流程 */
        [fabEl, document.getElementById("joinDownload")].filter(Boolean).forEach(function (button) {
          button.addEventListener("click", function () {
            dlDlg.showModal();
            dlStartCountdown();
          });
        });
      }
    })();

    /* —— 建造进度卡：分段按钮筛选清单（MD3 Outlined Segmented Button
       single-select · radiogroup 语义 + roving tabindex + 方向键） —— */
    (function () {
      var segEl = document.querySelector(".seg");
      if (!segEl) return;
      var btns = Array.prototype.slice.call(segEl.querySelectorAll(".seg__btn"));
      var items = Array.prototype.slice.call(document.querySelectorAll(".todo-list__item"));
      if (!btns.length) return;

      function select(btn) {
        btns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-selected", on);
          b.setAttribute("aria-checked", on ? "true" : "false");
          b.tabIndex = on ? 0 : -1;   /* roving tabindex */
        });
        var f = btn.getAttribute("data-filter");
        items.forEach(function (it) {
          var done = it.classList.contains("is-done");
          var show = f === "all" || (f === "done") === done;
          it.hidden = !show;
        });
      }

      btns.forEach(function (btn, i) {
        btn.addEventListener("click", function () { select(btn); });
        btn.addEventListener("keydown", function (e) {
          var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          var next = btns[(i + d + btns.length) % btns.length];
          select(next);
          next.focus();
        });
      });

      var initial = btns.filter(function (b) { return b.classList.contains("is-selected"); })[0] || btns[0];
      select(initial);
    })();

    /* —— MD3 Wavy Linear Progress：直接绘制连续前缀，不使用 dash/pathLength。
       有限 rAF 入场动画同步更新 path 终点和独立 circle；结束即停止。 */
    (function () {
      var lp = document.querySelector(".lp--wavy");
      if (!lp) return;
      var svg = lp.querySelector(".lp__svg");
      if (!svg) return;
      var card = lp.closest(".progress-card");
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var NS = "http://www.w3.org/2000/svg";
      function shape(tag, cls) {
        var el = document.createElementNS(NS, tag);
        el.setAttribute("class", cls);
        svg.appendChild(el);
        return el;
      }
      var track = shape("path", "lp__track");
      var active = shape("path", "lp__active");
      var stop = shape("circle", "lp__stop");
      var width = 0, mid = 0, amp = 0, len = 0;
      var value = 15, shown = 0, frame = 0;
      function num(v) { return parseFloat(v) || 0; }
      function waveY(x) { return mid - amp * Math.sin((x / len) * Math.PI * 2); }
      function waveD(w, mid, amp, len) {
        var d = "M0 " + mid.toFixed(2);
        for (var x = 2; x < w; x += 2) {
          var y = mid - amp * Math.sin((x / len) * Math.PI * 2);
          d += " L" + x.toFixed(2) + " " + y.toFixed(2);
        }
        var yEnd = mid - amp * Math.sin((w / len) * Math.PI * 2);
        return d + " L" + w.toFixed(2) + " " + yEnd.toFixed(2);
      }
      function draw(percent) {
        shown = percent;
        var x = width * percent / 100;
        active.setAttribute("d", waveD(x, mid, amp, len));
        stop.setAttribute("cx", x.toFixed(2));
        stop.setAttribute("cy", waveY(x).toFixed(2));
        active.style.opacity = stop.style.opacity = percent > 0 ? "1" : "0";
      }
      function visible() { return !card || card.classList.contains("is-visible"); }
      function reveal() {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        var target = visible() ? value : 0;
        if (reduceMotion || target === 0 || target === shown) { draw(target); return; }
        var from = shown, start = null;
        // Wait for the card's staggered reveal, so the fill remains visible throughout.
        var delay = card ? getComputedStyle(card).transitionDelay.split(",").reduce(function (max, part) {
          var seconds = parseFloat(part) || 0;
          return Math.max(max, part.trim().slice(-2) === "ms" ? seconds : seconds * 1000);
        }, 0) : 0;
        var duration = 900;
        function step(now) {
          if (start === null) start = now + delay;
          var t = Math.max(0, Math.min(1, (now - start) / duration));
          draw(from + (target - from) * (1 - Math.pow(1 - t, 3)));
          frame = t < 1 ? requestAnimationFrame(step) : 0;
        }
        frame = requestAnimationFrame(step);
      }
      function render() {
        var cs = getComputedStyle(lp);
        width = lp.clientWidth;
        amp = num(cs.getPropertyValue("--md-linear-progress-wave-amplitude"));
        len = num(cs.getPropertyValue("--md-linear-progress-wave-length"));
        if (!width || !amp || !len) return;
        var H = amp * 2 + num(cs.getPropertyValue("--md-linear-progress-track-height")) + 2;
        mid = H / 2;
        svg.setAttribute("viewBox", "0 0 " + width + " " + H);
        track.setAttribute("d", waveD(width, mid, amp, len));
        stop.setAttribute("r", String(num(cs.getPropertyValue("--md-linear-progress-stop-indicator-size")) / 2));
        var parsed = parseFloat(cs.getPropertyValue("--lp-value"));
        value = Math.max(0, Math.min(100, isFinite(parsed) ? parsed : 15));
        draw(shown);
        if (!frame) reveal();
      }
      render();
      if (card) {
        new MutationObserver(reveal).observe(card, { attributes: true, attributeFilter: ["class"] });
      }
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(render).observe(lp);
      } else {
        window.addEventListener("resize", render, { passive: true });
      }
    })();

    /* —— 建造清单折叠面板（默认收起；展开动画由 CSS grid-rows 驱动） —— */
    (function () {
      var clp = document.querySelector(".clp");
      if (!clp) return;
      var trigger = clp.querySelector(".clp__trigger");
      if (!trigger) return;
      trigger.addEventListener("click", function () {
        var open = !clp.classList.contains("is-open");
        clp.classList.toggle("is-open", open);
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
      });
    })();

    /* —— 地图全屏键（MD3 icon button -> Fullscreen API）——
       点击对 .map-shell 整体进全屏（含按钮，Esc 可退）；fullscreenchange
       同步 aria-label/title 文案，图标切换由 CSS :fullscreen 驱动。 */
    (function () {
      var shell = document.querySelector(".map-shell");
      var btn = document.getElementById("mapFsBtn");
      var translate = window.MineCGSI18n ? window.MineCGSI18n.t : function (source) { return source; };
      if (!shell || !btn) return;
      if (!shell.requestFullscreen) {
        /* 浏览器不支持 Fullscreen API（如 iOS Safari）：隐藏按钮，不留死键 */
        btn.hidden = true;
        return;
      }
      btn.addEventListener("click", function () {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          shell.requestFullscreen();
        }
      });
      function updateFullscreenLabel() {
        var on = document.fullscreenElement === shell;
        btn.setAttribute("aria-label", translate(on ? "退出全屏预览" : "全屏预览地图"));
        btn.setAttribute("title", translate(on ? "退出全屏" : "全屏预览"));
      }
      document.addEventListener("fullscreenchange", updateFullscreenLabel);
      document.addEventListener("minecgs:languagechange", updateFullscreenLabel);
    })();

    /* —— 地图预览：默认加载 + 空闲预渲染 + 缓存穿透 ——
       · 默认加载状态（71 轮定案）：预览页 URL 用裸地址，不带任何视角、
         缩放或定位预设参数，降低默认渲染压力。
       · 空闲预渲染：markup 保持 loading="lazy" 作无 JS 兜底；待 window
         load（首屏资源已就绪）且浏览器空闲时再把 iframe 升为 eager 并
         重设 src，提前拉起地图渲染 —— 滚动到地图区时基本零等待，且预
         加载排队在首屏之后，不与首屏资源竞争。
       · 缓存穿透：内嵌预览页曾被浏览器 HTTP 缓存钉在首次加载的旧版本，
         故每次载入本页（及从 bfcache 恢复）都给预览页 URL 注入唯一时间
         戳查询串 ?_ts=，强制回源取最新预览页（等效彻底禁用该内嵌页缓存）。
       · 外链"在新窗口打开地图"在点击时同样注入，新窗口也拿最新。 */
    (function () {
      var frame = document.querySelector(".map-shell iframe");
      if (!frame) return;
      var noteLink = document.querySelector(".progress__note a");
      var base = "https://map.minecgs.com/";
      function bust() {
        frame.src = base + "?_ts=" + Date.now();
      }
      bust();
      if (noteLink) {
        noteLink.addEventListener("click", function () {
          noteLink.href = base + "?_ts=" + Date.now();
        });
      }
      /* bfcache 恢复（关掉标签页再回来/前进后退）也算一次"打开"：强制重取 */
      window.addEventListener("pageshow", function (e) {
        if (e.persisted) bust();
      });
      /* 空闲预渲染：load 后浏览器空闲时升 eager 提前拉起地图渲染 */
      function schedulePrerender() {
        function prerender() {
          frame.loading = "eager";
          bust();
        }
        if (window.requestIdleCallback) {
          window.requestIdleCallback(prerender, { timeout: 2000 });
        } else {
          window.setTimeout(prerender, 200);
        }
      }
      if (document.readyState === "complete") {
        schedulePrerender();
      } else {
        window.addEventListener("load", schedulePrerender);
      }
    })();
