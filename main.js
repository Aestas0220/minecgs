    (function () {
      "use strict";

      var root = document.documentElement;
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* ============================================================
         0. 背景几何物理像素对齐（78 轮，撕裂修复三版）
         --page-bg-size/pos 的 CSS 公式（vw/vh 组合）在分数 DPR 设备上
         产生非整数物理像素 —— 典型如小米平板 7 Ultra：3200×2136 @DPR3
         → CSS 视口 1066.67px，背景图几何落点 6151.68px / -128.16px
         全是浮点；大图光栅化被迫线性过滤重采样，background-attachment:
         fixed 又在滚动/重绘期反复重算这个浮点对齐 —— 同 SOC 整数视口
         手机（小米 15S Pro 480px 宽）与整数网格桌面无此路径，故撕裂为
         该类设备独有。JS 把宽/高/偏移四舍五入到 1/DPR 网格（物理像素
         整数）后注入变量：光栅化落点整数对齐、滚动期纯整数 blit；
         CSS 公式保留作无 JS 兜底；.hero__bg / .page-sheet 共享同变量，
         对齐后两层像素重合不变。
         ============================================================ */
      (function alignPageBg() {
        function align() {
          var dpr = window.devicePixelRatio || 1;
          var W = window.innerWidth, H = window.innerHeight;
          var wCss = Math.max(W * 1.08, H * 1.92);   /* = max(108vw, 192vh) */
          var hCss = wCss * 9 / 16;                  /* 16:9 源图 auto 高 */
          var xCss = (W - wCss) / 2;                 /* = 50% 背景定位 */
          var yCss = H * 0.446 - hCss * 0.45;        /* = 44.6vh - 0.45h（与 CSS max 形式解析等价） */
          var q = function (v) { return Math.round(v * dpr) / dpr; };
          root.style.setProperty("--page-bg-size", q(wCss) + "px " + q(hCss) + "px");
          root.style.setProperty("--page-bg-pos", q(xCss) + "px " + q(yCss) + "px");
        }
        align();
        window.addEventListener("resize", align, { passive: true });
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", align, { passive: true });
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
      function applyTheme(theme, animate) {
        function commit() {
          root.setAttribute("data-theme", theme);
          if (themeToggle) {
            var label = theme === "dark" ? "切换为浅色模式" : "切换为深色模式";
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
         · 点击：原生锚点跳转（#hero 由 a[href=#hero] 处理器接管回顶）；
           程序化跳转期间抑制滚动判定（suppressNavScroll），滚动停 280ms
           后解除并重同步 —— 平滑滚动路过中间区段时不会逐个翻 tab
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

      /* tab 点击：立即切换激活态（原生锚点负责跳转）；
         跳转飞行期间抑制滚动判定，防中途翻 tab 抖动 */
      tabLinks.forEach(function (link) {
        link.addEventListener("click", function () {
          var id = link.getAttribute("data-section");
          for (var i = 0; i < navSections.length; i++) {
            if (navSections[i].id === id) { setActive(i, false); break; }
          }
          suppressNavScroll();
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
      measureTabs();
      placeIndicator(geomOfIdx(navActiveIdx), true);   /* 初始就位（零动画） */

      /* 钉住封面的 rect 永远停在视口顶，浏览器做锚点跳转时误判
         "已在视口内"而不滚动 —— #hero（品牌 LOGO / 首屏 tab）手动接管回顶 */
      Array.prototype.forEach.call(document.querySelectorAll('a[href="#hero"]'), function (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
          if (window.history && window.history.pushState) { window.history.pushState(null, "", "#hero"); }
          suppressNavScroll();
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
      /* 81 轮接缝裁切：.page-bg（视口冻结模糊层）以 clip-path 裁进 sheet
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

      function dlStartCountdown() {
        var left = 3;
        dlConfirm.disabled = true;
        dlConfirm.setAttribute("aria-disabled", "true");
        dlCountdown.textContent = "请阅读以上须知，" + left + " 秒后可确认";
        window.clearInterval(dlTimer);
        dlTimer = window.setInterval(function () {
          left -= 1;
          if (left > 0) {
            dlCountdown.textContent = "请阅读以上须知，" + left + " 秒后可确认";
          } else {
            window.clearInterval(dlTimer);
            dlTimer = null;
            dlConfirm.disabled = false;
            dlConfirm.removeAttribute("aria-disabled");
            dlCountdown.textContent = "倒计时结束，现在可以确认下载";
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
        if (fabEl) {
          fabEl.addEventListener("click", function () {
            dlDlg.showModal();
            dlStartCountdown();
          });
        }
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

    /* —— MD3 Wavy Linear Progress：正弦波 path 生成 ——
       track/active/stop 三 path 同形（pathLength=100 归一），dash 动画见
       style.css；ResizeObserver 重算（is-resizing 关过渡防追赶动画）。 */
    (function () {
      var lp = document.querySelector(".lp--wavy");
      if (!lp) return;
      var svg = lp.querySelector(".lp__svg");
      if (!svg) return;
      var NS = "http://www.w3.org/2000/svg";
      var track = document.createElementNS(NS, "path");
      var active = document.createElementNS(NS, "path");
      var stop = document.createElementNS(NS, "path");
      track.setAttribute("class", "lp__track");
      active.setAttribute("class", "lp__active");
      stop.setAttribute("class", "lp__stop");
      active.setAttribute("pathLength", "100");
      stop.setAttribute("pathLength", "100");
      svg.appendChild(track);
      svg.appendChild(active);
      svg.appendChild(stop);

      function num(v) { return parseFloat(v) || 0; }
      function waveD(w, mid, amp, len) {
        var d = "M0 " + mid.toFixed(2);
        for (var x = 2; x < w; x += 2) {
          var y = mid - amp * Math.sin((x / len) * Math.PI * 2);
          d += " L" + x.toFixed(2) + " " + y.toFixed(2);
        }
        var yEnd = mid - amp * Math.sin((w / len) * Math.PI * 2);
        d += " L" + w.toFixed(2) + " " + yEnd.toFixed(2);
        return d;
      }
      function render(animate) {
        var cs = getComputedStyle(lp);
        var w = lp.clientWidth;
        if (!w) return;
        var amp = num(cs.getPropertyValue("--md-linear-progress-wave-amplitude"));
        var len = num(cs.getPropertyValue("--md-linear-progress-wave-length"));
        var stroke = num(cs.getPropertyValue("--md-linear-progress-track-height"));
        if (!amp || !len) return;
        var H = amp * 2 + stroke + 2;
        var mid = H / 2;
        svg.setAttribute("viewBox", "0 0 " + w + " " + H);
        var d = waveD(w, mid, amp, len);
        track.setAttribute("d", d);
        active.setAttribute("d", d);
        stop.setAttribute("d", d);
        /* --lp-value（如 15%）→ dashoffset 100-15=85（CSS 兜底值同） */
        var v = num(cs.getPropertyValue("--lp-value")) || 15;
        lp.style.setProperty("--lp-off", String(100 - v));
        if (!animate) {
          lp.classList.add("is-resizing");
          void lp.offsetWidth;   /* 强制回流，瞬时完成重算 */
          requestAnimationFrame(function () { lp.classList.remove("is-resizing"); });
        }
      }
      render(true);
      if (typeof ResizeObserver !== "undefined") {
        var ro = new ResizeObserver(function () { render(false); });
        ro.observe(lp);
      } else {
        window.addEventListener("resize", function () { render(false); });
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
      document.addEventListener("fullscreenchange", function () {
        var on = document.fullscreenElement === shell;
        btn.setAttribute("aria-label", on ? "退出全屏预览" : "全屏预览地图");
        btn.setAttribute("title", on ? "退出全屏" : "全屏预览");
      });
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
