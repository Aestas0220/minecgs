    (function () {
      "use strict";

      var root = document.documentElement;
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* ============================================================
         1. Dynamic Color —— 谷歌 Material Color Utilities 官方流水线
         种子 = 砖红/陶土 #B4552F（第四十轮用户定稿，策展值）。
         取色验证：image.webp 全局 Celebi+Score 输出金卡其（HCT hue≈90，
         低饱和砖红相位所致），与观感不符；改用图中砖红域策展种子，
         生成仍走官方 SchemeTonalSpot -> 36 个 MD3 角色（与 CSS 静态兜底同源）。
         ============================================================ */
      var SEED = 0xffb4552f;
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

      /* 由种子色生成 light/dark 两套色板并写入样式表 */
      function applyDynamicColor(seedArgb) {
        var light = new MCU.SchemeTonalSpot(MCU.Hct.fromInt(seedArgb), false, 0);
        var dark = new MCU.SchemeTonalSpot(MCU.Hct.fromInt(seedArgb), true, 0);
        var lightVars = extractRoles(light);
        var darkVars = extractRoles(dark);

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
          ":root{" + block(lightVars) + "}" +
          '[data-theme="dark"]{' + block(darkVars) + "}";

        try { localStorage.setItem("gcgs-mc-seed", String(seedArgb)); } catch (e) {}
      }

      function runDynamicColor() {
        /* 策展种子直出；applyDynamicColor 会覆写 localStorage 旧种子缓存 */
        applyDynamicColor(SEED);
      }

      if (window.MCU && MCU.MaterialDynamicColors) {
        runDynamicColor();
      }

      /* ============================================================
         2. 深浅色切换（MD3 全局角色过渡）
         ============================================================ */
      var themeToggle = document.getElementById("themeToggle");

      function applyTheme(theme) {
        root.setAttribute("data-theme", theme);
        if (themeToggle) {
          var label = theme === "dark" ? "切换为浅色模式" : "切换为深色模式";
          themeToggle.setAttribute("aria-label", label);
          themeToggle.setAttribute("title", label);
        }
      }

      var savedTheme = null;
      try { savedTheme = localStorage.getItem("gcgs-theme"); } catch (e) {}
      var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : (systemDark ? "dark" : "light"));

      if (themeToggle) {
        themeToggle.addEventListener("click", function () {
          var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
          applyTheme(next);
          try { localStorage.setItem("gcgs-theme", next); } catch (e) {}
        });
      }

      /* ============================================================
         3. Top App Bar 滚动态（MD3：滚动后 surface container + elevation 2）
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
         品牌自适应：顶栏宽度不足以同时容纳品牌 + 导航簇时，
         品牌整体隐去（含圆点）；宽屏桌面完整展示。
         测量式隐藏 —— 不依赖断点，字体加载完成后再校准一次
         ------------------------------------------------------------ */
      (function fitBrand() {
        if (!topBar) return;
        var brand = topBar.querySelector(".brand");
        var cluster = topBar.querySelector(".nav-cluster");
        if (!brand || !cluster) return;
        function measure() {
          brand.classList.remove("is-hidden");
          var cs = window.getComputedStyle(topBar);
          var avail = topBar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          var needed = brand.offsetWidth + cluster.offsetWidth + 16;
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
         4. 滚动监听 —— Intersection Observer 上浮淡入 + Tab 高亮
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

      var navEl = document.getElementById("nav");
      var navLinks = document.querySelectorAll(".nav__link[data-section]");
      var pillEl = document.getElementById("navPill");
      var ghostEl = document.getElementById("navPillGhost");
      /* 导航激活态：单一滚动位置驱动（第三十轮）+ 共享胶囊交互（第三十一轮）。
         第三十轮教训：同一 UI 状态两套机制（IO + 滚动重置）必竞争 ——
         现所有状态变更都走唯一出口 setActive()，输入源分三路：
         · 滚动：检测线（视口 50% 处）落在哪个区段哪个激活，区界 20px 迟滞；
           hero 钉住 rect 恒在视口顶须特殊取 0，其余 rect.top+scrollY 稳定坐标
         · 点击：旧胶囊 90ms 极短渐变消失（ghost 残影，无收起形变），
           同时新胶囊在目标按钮中心 width 0→满宽展开（decelerate 快→慢）；
           非相邻按钮切换绝不经过中间按钮（不做位移形变过渡）；
           跳转走原生锚点（#hero 由 a[href=#hero] 处理器接管回顶）
         · 拖动滑块：胶囊 1:1 跟手（中心=指针 x，宽度按相邻按钮插值）；
           指针跨过按钮阈值（相邻中心的中点）即执行与点击等同的跳转
           （非无极：整段拖动只在过阈值时换页，过一次跳一次）；
           松手磁吸回激活按钮；拖动中按钮微缩+状态层压深（按压感）
         程序化跳转（点击/拖动）期间抑制滚动判定（suppressNavScroll），
         滚动停 280ms 后解除并重同步 —— 否则平滑滚动路过中间区段时
         胶囊会逐个过渡（正是用户否决的观感） */
      var navSections = ["hero", "intro", "progress", "join"].map(function (id) {
        return { id: id, el: document.getElementById(id) };
      }).filter(function (s) { return s.el; });
      var navTops = [];
      var navActiveIdx = 0;
      var navGeom = [];            /* 各按钮胶囊几何 {left,width}（相对 .nav，与 navSections 同序） */
      var navSuppress = false;
      var navSuppressTimer = 0;
      var navClickSuppress = false; /* 拖动衍生的合成 click 抑制旗标 */
      var navDrag = null;

      function measureNav() {
        var sy = window.scrollY || 0;
        navTops = navSections.map(function (s) {
          /* hero 钉住（sticky）rect 恒在视口顶，须特殊取 0；
             其余区段正常流，rect.top + scrollY = 稳定文档坐标 */
          return s.id === "hero" ? 0 : s.el.getBoundingClientRect().top + sy;
        });
      }
      function measurePill() {
        navGeom = navSections.map(function (s) {
          var link = null;
          Array.prototype.forEach.call(navLinks, function (l) {
            if (l.getAttribute("data-section") === s.id) { link = l; }
          });
          return link ? { left: link.offsetLeft, width: link.offsetWidth } : { left: 0, width: 0 };
        });
      }
      function geomOfIdx(i) { return navGeom[i] || { left: 0, width: 0 }; }
      /* 拖动跟手几何：中心=手指 x（钳到首尾按钮中心间防出界），
         宽度在相邻按钮宽度间线性插值（段内 t 由 x 定义 → 中心恒等于 x） */
      function geomAtX(x) {
        var n = navGeom.length;
        if (!n) { return { left: 0, width: 0 }; }
        var c0 = navGeom[0].left + navGeom[0].width / 2;
        var cN = navGeom[n - 1].left + navGeom[n - 1].width / 2;
        if (x <= c0) { return { left: navGeom[0].left, width: navGeom[0].width }; }
        if (x >= cN) { return { left: navGeom[n - 1].left, width: navGeom[n - 1].width }; }
        for (var i = 0; i < n - 1; i++) {
          var a = navGeom[i], b = navGeom[i + 1];
          var ca = a.left + a.width / 2, cb = b.left + b.width / 2;
          if (x <= cb) {
            var t = (x - ca) / (cb - ca);
            var w = a.width + (b.width - a.width) * t;
            return { left: x - w / 2, width: w };
          }
        }
        return { left: navGeom[n - 1].left, width: navGeom[n - 1].width };
      }
      /* 阈值位置：相邻按钮中心的中点为界，手指落在哪段归哪个按钮 */
      function idxAtX(x) {
        var best = 0, bestD = Infinity;
        for (var i = 0; i < navGeom.length; i++) {
          var d = Math.abs(x - (navGeom[i].left + navGeom[i].width / 2));
          if (d < bestD) { bestD = d; best = i; }
        }
        return best;
      }
      function placePill(g) {
        if (!pillEl) { return; }
        pillEl.style.left = g.left + "px";
        pillEl.style.width = g.width + "px";
      }
      function placePillNow(g) {
        if (!pillEl) { return; }
        pillEl.classList.add("is-anim-off");
        placePill(g);
        void pillEl.offsetWidth;
        pillEl.classList.remove("is-anim-off");
      }
      /* 关闭：旧胶囊极短渐变（~90ms）消失 —— 无收起形变（要求 1） */
      function ghostFade(g) {
        if (!ghostEl || reduceMotion || !g.width) { return; }
        ghostEl.classList.add("is-anim-off");
        ghostEl.style.left = g.left + "px";
        ghostEl.style.width = g.width + "px";
        ghostEl.style.opacity = "1";
        void ghostEl.offsetWidth;
        ghostEl.classList.remove("is-anim-off");
        ghostEl.style.opacity = "0";
      }
      /* 展开：目标按钮中心 width 0→满宽（decelerate 快→慢），
         left/width 同曲线同周期 → 每帧皆全圆角鹅卵石 */
      function pillExpandTo(g) {
        if (!pillEl) { return; }
        pillEl.classList.add("is-anim-off");
        pillEl.style.left = (g.left + g.width / 2) + "px";
        pillEl.style.width = "0px";
        void pillEl.offsetWidth;                 /* 回流锁定：先复位后展开 */
        pillEl.classList.remove("is-anim-off");
        pillEl.style.left = g.left + "px";
        pillEl.style.width = g.width + "px";
      }
      /* 唯一状态出口：mode "expand"=完整视觉（滚动/点击）；"none"=只切类（拖动跟手中） */
      function setActive(idx, mode) {
        if (idx === navActiveIdx || !navSections[idx]) { return; }
        var oldGeom = geomOfIdx(navActiveIdx);
        navActiveIdx = idx;
        var activeId = navSections[navActiveIdx].id;
        Array.prototype.forEach.call(navLinks, function (link) {
          link.classList.toggle("is-active", link.getAttribute("data-section") === activeId);
        });
        if (mode === "expand") {
          ghostFade(oldGeom);
          pillExpandTo(geomOfIdx(navActiveIdx));
        }
      }
      function suppressNavScroll() {
        navSuppress = true;
        if (navSuppressTimer) { clearTimeout(navSuppressTimer); }
        navSuppressTimer = setTimeout(function () {
          if (navDrag && navDrag.moved) { suppressNavScroll(); return; }  /* 拖动未结束不解除 */
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
        if (past <= 20) { return; }
        setActive(rawIdx, "expand");
      }
      /* 拖动阈值跳转：与点击等同（hero 回顶，其余 scrollIntoView 且尊重 scroll-margin） */
      function jumpToSection(id) {
        if (id === "hero") {
          window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
          return;
        }
        var el = document.getElementById(id);
        if (el && el.scrollIntoView) {
          el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      }

      /* ---- 拖动滑块交互（pointer events；横向手势归我们，纵向 pan-y 交还滚动） ---- */
      if (navEl) {
        navEl.addEventListener("dragstart", function (e) { e.preventDefault(); });
        navEl.addEventListener("pointerdown", function (e) {
          if (!e.isPrimary || (typeof e.button === "number" && e.button > 0)) { return; }
          navClickSuppress = false;              /* 新手势清旧旗标（拖动后未合成 click 的兜底） */
          navDrag = {
            id: e.pointerId,
            x0: e.clientX,
            y0: e.clientY,
            moved: false,
            rect: navEl.getBoundingClientRect()  /* top-bar 固定，拖动期间几何稳定 */
          };
        });
        navEl.addEventListener("pointermove", function (e) {
          if (!navDrag || e.pointerId !== navDrag.id) { return; }
          var dx = e.clientX - navDrag.x0, dy = e.clientY - navDrag.y0;
          if (!navDrag.moved) {
            /* 进入拖动：横向位移过 8px 且横向主导（纵向意图交还 pan-y 页面滚动） */
            if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) { return; }
            navDrag.moved = true;
            navClickSuppress = true;             /* 手势收尾的合成 click 不跳转 */
            navEl.classList.add("is-dragging");  /* 按压态反馈：按钮微缩+微暗 */
            if (pillEl) {
              pillEl.classList.add("is-anim-off");
              pillEl.style.opacity = "1";
            }
            suppressNavScroll();
            if (navEl.setPointerCapture) {
              try { navEl.setPointerCapture(e.pointerId); } catch (err) {}
            }
          }
          var x = e.clientX - navDrag.rect.left;
          placePill(geomAtX(x));                 /* 胶囊 1:1 实时跟手 */
          var idx = idxAtX(x);
          if (idx !== navActiveIdx) {
            setActive(idx, "none");              /* 过阈值：切激活但胶囊仍跟手 */
            jumpToSection(navSections[idx].id);  /* 等同点击的跳转（非无极） */
            suppressNavScroll();
          }
        });
        function navDragEnd(e) {
          if (!navDrag || (e && e.pointerId !== navDrag.id)) { return; }
          var wasDrag = navDrag.moved;
          navDrag = null;
          if (!wasDrag) { return; }
          navEl.classList.remove("is-dragging");
          if (pillEl) { pillEl.classList.remove("is-anim-off"); }
          placePill(geomOfIdx(navActiveIdx));    /* 磁吸回激活按钮 */
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", "#" + navSections[navActiveIdx].id);
          }
          setTimeout(function () { navClickSuppress = false; }, 400);
        }
        navEl.addEventListener("pointerup", navDragEnd);
        navEl.addEventListener("pointercancel", navDragEnd);
        /* 点击：完整视觉（残影消失 + 中心展开）；跳转走原生锚点默认动作
           （#hero 由下方 a[href=#hero] 处理器接管），此处不重复跳 */
        navEl.addEventListener("click", function (e) {
          var link = e.target && e.target.closest ? e.target.closest(".nav__link") : null;
          if (!link) { return; }
          if (navClickSuppress) {
            e.preventDefault();
            e.stopPropagation();
            navClickSuppress = false;
            return;
          }
          var id = link.getAttribute("data-section");
          for (var i = 0; i < navSections.length; i++) {
            if (navSections[i].id === id) { setActive(i, "expand"); break; }
          }
          suppressNavScroll();                   /* 跳转飞行期间不回灌滚动判定 */
        });
      }

      /* 布局漂移（字体交换/图片落位/主题切换尺寸变化）→ 重测区段坐标；
         只读 rect 不写布局，无反馈回路 */
      if ("ResizeObserver" in window && document.body) {
        new ResizeObserver(function () { measureNav(); }).observe(document.body);
      }
      if ("ResizeObserver" in window && navEl) {
        new ResizeObserver(function () {
          measurePill();
          if (navDrag && navDrag.moved) { return; }   /* 拖动中跟手优先 */
          placePill(geomOfIdx(navActiveIdx));
        }).observe(navEl);
      }
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          measureNav(); measurePill(); placePillNow(geomOfIdx(navActiveIdx));
        });
      }
      measurePill();
      placePillNow(geomOfIdx(navActiveIdx));   /* 初始就位（零动画） */

      /* 钉住封面的 rect 永远停在视口顶，浏览器做锚点跳转时误判
         "已在视口内"而不滚动 —— #hero（品牌 LOGO / 首屏按钮）手动接管回顶 */
      Array.prototype.forEach.call(document.querySelectorAll('a[href="#hero"]'), function (link) {
        link.addEventListener("click", function (e) {
          if (navClickSuppress) { return; }    /* 拖动衍生的合成 click 不跳转 */
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
          if (window.history && window.history.pushState) { window.history.pushState(null, "", "#hero"); }
          suppressNavScroll();
        });
      });

      /* ============================================================
         5. 封面退场（滚动联动）
           · 封面钉住零平移 —— 不做任何随滚动的位移视差（旧版
             0.42×/0.18× 三层差速平移正是"下滑时背景滚动"的根源：
             半透明中段层间剪切全部暴露，触屏直推下尤其刺眼）
           · 退场"模糊消隐" = 预模糊分层交叉淡化（GoogleChromeLabs
             ui-element-samples · animated-blur 技法，Apache-2.0，
             页脚开源致谢）：清晰层上依次淡入两个静态模糊副本
            （blur 9→24px，移动端 6→16px），视觉等效模糊半径连续
             递增，但逐帧只改 opacity —— 合成器零重绘。
             旧版逐帧 filter: blur() 是 GPU 卷积着色器每帧全量重跑，
             正是 hero 切换卡顿与波场迟滞的元凶（Chrome 官方实测：
             逐帧动画 blur 比任何替代方案慢一个量级）
           · 文字层同理：静态模糊的封面克隆（残影）交叉淡入 + 上
             lift + 渐隐 —— 三合一退场，观感与旧版一致
           · 波场裁切已结构化（.wave-clip 与面板同圆角、随面板
             同帧滚动），不再需要 JS 对齐滑界 —— 封面任何透明度
             下都看不到波场，渲染压力再大也不可能错位
           · smoothstep 缓动，起止柔和无跳变；scroll-hint 先行淡出
         ============================================================ */
      var heroVisual = document.getElementById("heroVisual");
      var heroStage = document.getElementById("heroStage");
      var heroSection = document.getElementById("hero");
      var heroPanelEl = document.getElementById("heroPanel");   /* 清晰封面字（快退层） */
      var heroBlur1 = document.getElementById("heroBlur1");
      var heroBlur2 = document.getElementById("heroBlur2");
      var heroBlur3 = document.getElementById("heroBlur3");
      var heroGhost1 = document.getElementById("heroGhost1");
      var heroGhost2 = document.getElementById("heroGhost2");
      var scrollHint = document.querySelector(".scroll-hint");
      var ticking = false;
      var heroH = 0;             /* 缓存 hero 高度 —— 滚动热路径禁读 offsetHeight（强制布局） */
      var visOpacity = -1, visScale = -1;
      var visB1 = -1, visB2 = -1, visB3 = -1;  /* 预模糊背景层交叉淡化 */
      var stageOpacity = -1, stageLift = -1, stageCover = -1;
      var stageG1 = -1, stageG2 = -1;
      var hintOpacity = -1;
      var brandChip = topBar ? topBar.querySelector(".brand") : null;
      var brandShown = false;
      /* Extended FAB：滚过 hero 封面后自右下浮现（阈值迟滞防临界闪烁） */
      var fabEl = document.getElementById("fabDownload");
      var fabShown = false;

      /* 文字退场预模糊残影（双级 g1/g2）：克隆封面为静态模糊副本
        （模糊值恒定 → 只烘焙一次），退场时与清晰版交叉淡化。
         克隆去 id / 去焦点 / aria-hidden —— 纯视觉副本，
         不进无障碍树、不抢交互 */
      (function buildHeroGhost() {
        var src = document.getElementById("heroPanel");
        if (!src) { return; }
        var hosts = [document.getElementById("heroGhostBlur1"), document.getElementById("heroGhostBlur2")];
        for (var h = 0; h < hosts.length; h++) {
          var host = hosts[h];
          if (!host) { continue; }
          var ghost = src.cloneNode(true);
          ghost.removeAttribute("id");
          ghost.setAttribute("aria-hidden", "true");
          var ided = ghost.querySelectorAll("[id]");
          for (var gi = 0; gi < ided.length; gi++) { ided[gi].removeAttribute("id"); }
          var focusables = ghost.querySelectorAll("a, button, input, [tabindex]");
          for (var fi = 0; fi < focusables.length; fi++) {
            focusables[fi].setAttribute("tabindex", "-1");
            focusables[fi].setAttribute("aria-hidden", "true");
          }
          host.appendChild(ghost);
        }
      })();

      function updateParallax() {
        var y = window.scrollY || 0;
        if (navSuppress) { suppressNavScroll(); }   /* 程序化飞行中滚动仍在发生 → 续期抑制 */
        if (heroSection) {
          if (!heroH) { heroH = heroSection.offsetHeight || window.innerHeight; measureNav(); }
          var p = Math.min(Math.max(y / heroH, 0), 1);

          /* 导航激活态：统一滚动位置判定（见上方 updateNav）——
             封面区与内容区不再两套机制竞争 */
          updateNav(y);

          /* 品牌标签：hero 封面页隐去，第二页（内容面板滑过）起淡入；
             显/隐分设阈值 0.45 / 0.35 迟滞，防临界往复闪烁 */
          if (brandChip) {
            var wantBrand = brandShown ? p > 0.35 : p > 0.45;
            if (wantBrand !== brandShown) {
              brandShown = wantBrand;
              brandChip.classList.toggle("is-shown", brandShown);
            }
          }

          /* Extended FAB「下载进服包」：封面滑过后浮现（0.85 / 0.75 迟滞） */
          if (fabEl) {
            var wantFab = fabShown ? p > 0.75 : p > 0.85;
            if (wantFab !== fabShown) {
              fabShown = wantFab;
              fabEl.classList.toggle("is-shown", fabShown);
            }
          }

          if (!reduceMotion) {
            var e = p * p * (3 - 2 * p);            /* smoothstep：慢起慢收，过渡柔和 */

            if (heroVisual) {
              var vo = Math.max(1 - e * 1.1, 0);
              if (Math.abs(vo - visOpacity) > 0.01) { heroVisual.style.opacity = vo.toFixed(3); visOpacity = vo; }
              var vs = 1 + e * 0.05;               /* 缓推：径向运动，不产生平移剪切 */
              if (Math.abs(vs - visScale) > 0.001) {
                heroVisual.style.transform = vs > 1.001 ? "scale(" + vs.toFixed(3) + ")" : "none";
                visScale = vs;
              }
              /* 预模糊层交叉淡化（动画只碰 opacity）：
                 b1 e 0.05→0.50、b2 0.30→0.70、b3 0.55→1.00 依次淡入，
                 σ 12/32/64 递进 —— 叠在清晰层上 = 模糊半径连续递增
                 的观感，尾段图像完全糊化（第三十五轮：旧 9/24px 双档
                 对大字太弱、尾段仍可辨） */
              var b1 = (e - 0.05) / 0.45;
              b1 = b1 < 0 ? 0 : (b1 > 1 ? 1 : b1);
              if (Math.abs(b1 - visB1) > 0.01) {
                if (heroBlur1) { heroBlur1.style.opacity = b1.toFixed(3); }
                visB1 = b1;
              }
              var b2 = (e - 0.30) / 0.40;
              b2 = b2 < 0 ? 0 : (b2 > 1 ? 1 : b2);
              if (Math.abs(b2 - visB2) > 0.01) {
                if (heroBlur2) { heroBlur2.style.opacity = b2.toFixed(3); }
                visB2 = b2;
              }
              var b3 = (e - 0.55) / 0.45;
              b3 = b3 < 0 ? 0 : (b3 > 1 ? 1 : b3);
              if (Math.abs(b3 - visB3) > 0.01) {
                if (heroBlur3) { heroBlur3.style.opacity = b3.toFixed(3); }
                visB3 = b3;
              }
            }
            if (heroStage) {
              var so = Math.max(1 - e * 1.25, 0);
              if (Math.abs(so - stageOpacity) > 0.01) { heroStage.style.opacity = so.toFixed(3); stageOpacity = so; }
              var sl = -e * 44;                    /* 上 lift：模糊残影 + lift + fade 三合一退场 */
              if (Math.abs(sl - stageLift) > 0.25) {
                heroStage.style.transform = "translate3d(0," + sl.toFixed(1) + "px,0)";
                stageLift = sl;
              }
              /* 清晰封面字快退（e 0→0.25）：把"可读窗口"压到最短，
                 由 g1/g2 双级残影逐级接管模糊（第三十五轮） */
              var co = Math.max(1 - e / 0.25, 0);
              if (Math.abs(co - stageCover) > 0.01) {
                if (heroPanelEl) { heroPanelEl.style.opacity = co.toFixed(3); }
                stageCover = co;
              }
              var g1 = e / 0.30;                   /* g1 轻糊接管 */
              g1 = g1 < 0 ? 0 : (g1 > 1 ? 1 : g1);
              if (Math.abs(g1 - stageG1) > 0.01) {
                if (heroGhost1) { heroGhost1.style.opacity = g1.toFixed(3); }
                stageG1 = g1;
              }
              var g2 = (e - 0.20) / 0.40;          /* g2 重糊收尾 */
              g2 = g2 < 0 ? 0 : (g2 > 1 ? 1 : g2);
              if (Math.abs(g2 - stageG2) > 0.01) {
                if (heroGhost2) { heroGhost2.style.opacity = g2.toFixed(3); }
                stageG2 = g2;
              }
            }
            if (scrollHint) {
              var ho = Math.max(1 - p * 2.6, 0);      /* 提示先行淡出 */
              if (Math.abs(ho - hintOpacity) > 0.01) { scrollHint.style.opacity = ho.toFixed(3); hintOpacity = ho; }
            }
          }
        }
        ticking = false;
      }

      function requestParallax() {
        if (!ticking) { ticking = true; window.requestAnimationFrame(updateParallax); }
      }
      window.addEventListener("scroll", requestParallax, { passive: true });
      window.addEventListener("resize", function () { heroH = 0; requestParallax(); }, { passive: true });
      window.addEventListener("load", function () { heroH = 0; requestParallax(); });  /* 图片/字体落位后重测 */
      updateParallax();

      /* ============================================================
         6. 动态背景 —— 纵向波线场（simplex-noise 位移场）
         · 上百条细竖线共享同一平滑位移场，以材料坐标 x0 为输入：
           |∂offset/∂x0| < 1 → 波前有序推进、线条永不交叉（网格模拟验证）
         · 三层噪声叠加（振幅 48/18/5）：聚散成疏密带；
           密度差映射亮度 —— 聚拢处成亮带、稀疏处隐没，密度带即体积感
         · 关键线人格混插（水波曲面错觉的骨架）：零星 KEYS=8 根"关键线"
           随机落在全页（位置抖动 ±35% 槽宽），每根有独立的随机倾角与
           弯曲曲线（角度、曲率各不相同）；其余线条在相邻关键线之间用
           smootherstep 混插人格 —— 线条间曲线平滑插值过渡，形成凹凸
           曲面的错觉，像水波；疏密呼吸贯穿全页（含中段），无端部收拢
         · 关键线弯曲沿 y 低频双八度（10px/4px，特征高约 450/230px）+
           静态倾角混插：整体走向一致、局部形态自然多样；
           bend 在每线 × 每 2 采样网格求值 + Catmull-Rom 插值，
           与 tilt（对 y 线性）同为 C1+ —— 线段衔接处无折角突变
         · 高斯透镜排斥（仅鼠标/触控笔持续扰动）+ 点击扩散圆圈（轻点/点击
           触发，easeOutCubic 外扩环带径向推开线条）—— 两层共存
         · 移动端触屏不做滑动跟手扭曲（拖动手势只滚动页面），背景的
           互动反馈只由轻点波纹触发；透镜强度缓入缓出、隐身归位
         · 随滚动 0.12× 漂移与前景卡片形成视差；reduced-motion 静帧
         · 位移场在粗网格（每 3 线 × 每 2 采样）求值，x 向线性 +
           y 向 Catmull-Rom 三次插值；描边用二次贝塞尔中点平滑 ——
           线形全程 C1 连续、无折线棱角
         · 自适应画质档位：帧预算监督（draw 耗时 + 帧间隔）超阈逐档
           减负（线数 / 采样 / DPR / 渐变色标 / 抽帧），健康设备 0 档
           = 全量；档位只动渲染密度，场形态参数不随档位变化
         · baseAlpha 深色 0.22 / 浅色 0.16 —— 浅色再降一档，
           避免线条干扰黑色正文可读性
         ============================================================ */
      (function initWaveField() {
        var canvas = document.getElementById("waveCanvas");
        if (!canvas || !canvas.getContext) return;
        if (typeof SN === "undefined" || !SN.createNoise3D) return;
        var ctx = canvas.getContext("2d");
        var dpr = 1;                     /* resize() 按面积预算 + 档位实算 */
        var cssW = 0, cssH = 0;

        var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, inside: false, power: 0 };
        var scrollDrift = 0;
        var ripples = [];                       /* 点击扩散圆圈（轻点/点击触发） */

        /* 固定种子 → 视口缩放、重排后场形态不跳变 */
        function mulberry32(a) {
          return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          };
        }
        var noise = SN.createNoise3D(mulberry32(20261001));

        /* 位移场：三层 simplex 噪声（振幅 48/18/5，波长各异）
           —— 全页连续"呼吸"的共享流场，负责疏密起伏（水波凹凸基底），
           密度差映射亮度 → 波面自然明暗，无任何人工端部收拢 */
        function fieldOffset(x0, wy, t) {
          return 48 * noise(x0 * 0.0018, wy * 0.0011, t * 0.07)
               + 18 * noise(x0 * 0.0042 + 41, wy * 0.0030, t * 0.14)
               + 5 * noise(x0 * 0.0080 + 82, wy * 0.0065, t * 0.21);
        }

        /* 关键线人格混插（水波曲面错觉的骨架）：
           KEYS 根"关键线"随机落在全页，每根有独立的倾角与弯曲曲线
          （角度、曲率各不相同）；其余线条在相邻关键线之间用 smootherstep
           混插人格 —— 线条间曲线平滑过渡，形成凹凸曲面的错觉，像水波。

           波前关键可调参数（后续微调入口）：
           KEYS        —— 关键线根数（越多人格变化越频密）
           KEY_JITTER  —— 关键线位置随机幅度（槽宽比例；0=等距）
           KEY_TILT    —— 关键线倾角振幅（×1.8 后实际约 ±0.04）
           KEY_BEND1/2 —— 关键线弯曲两八度振幅（px）
           KB_KY1/2    —— 弯曲纵向频率（0.0022/0.0042 → 特征高约 450/230px）
           实测定标（_sweep_wave4/5 扫描）：KEYS=8 / JITTER .35 / TILT .022 /
           BEND 10+4 → 7 时间采样 × 6 场景 574,560 对零交叉、minGap +1.81px、
           中段疏密呼吸 3.4× */
        var KEYS = 8, KEY_JITTER = 0.35, KEY_TILT = 0.022;
        var KEY_BEND1 = 10, KEY_BEND2 = 4, KB_KY1 = 0.0022, KB_KY2 = 0.0042;
        function keyBend(k, wy, t) {
          return KEY_BEND1 * noise(k * 2.13 + 500, wy * KB_KY1, t * 0.035)
               + KEY_BEND2 * noise(k * 4.7 + 700, wy * KB_KY2, t * 0.07);
        }

        var WAVE_PAD = 80;                /* 上下溢出余量，防拨动露边 */
        var X_PAD = 200;                  /* 水平过盈：材料域两侧各外扩 200px，
                                             波场把线条扭离边缘时域外线条跟进
                                             回填，页面左右缘不留空白。
                                             预算=静态最坏 ~108px（场 71+弯曲 14+
                                             倾角 23）+ 透镜 62 + 涟漪 26 ≈ 196 */
        var LINES = 0, SAMPLES = 0, spacing = 0;
        var GW = 0, GH = 0;               /* 粗网格：每 3 线 × 每 2 采样 */
        var grid = null, fineX = null, yAt = null;
        var keyBendGrid = null;           /* KEYS × GH：关键线弯曲锚 */
        var bendGrid = null;              /* LINES × GH：混插后的每线弯曲 */
        var blendK = null;                /* LINES × 2：[k0, smootherstep 权重] */
        var tiltArr = null;               /* 每线静态倾角（关键线混插） */

        /* ---- 自适应画质档位（帧预算驱动，监督逻辑在 loop）----
           开销随画布像素与线数在阈值后骤增（4K 全屏 / 大平板 /
           保守 WebView 都撞在同一堵墙上）。实测 draw 耗时 + 帧间隔
           双信号超阈就逐档减负：线距↑线数↓、纵向采样↓、DPR↓、
           渐变色标↓、最深档 30fps 抽帧；有余量逐档回升。
           健康设备永远停在 0 档 = 改前的全量画质。
           档位只动"渲染密度"，不动场的形态参数（振幅 / 关键线 /
           倾角 / 弯曲全不变）—— 线条人格与不交叉预算与档位无关 */
        var tier = 0;
        var TIER_SPACING = [1, 1, 1.4, 1.9];   /* 线距倍率（线数↓） */
        var TIER_SAMP_D = [56, 48, 40, 32];    /* 纵向采样（桌面，偶数对齐粗网格） */
        var TIER_SAMP_M = [40, 36, 30, 26];    /* 纵向采样（窄屏） */
        var TIER_STOPS = [8, 8, 6, 4];         /* 渐变色标数 */
        var TIER_DPR = [1, 1, 0.85, 0.7];      /* DPR 倍率（另有面积预算帽） */
        var TIER_SKIP = [1, 1, 1, 2];          /* 抽帧：每 N 帧画 1 帧 */
        var PIXEL_BUDGET = 6000000;            /* 后备缓冲像素预算 ≈ 6M */

        /* 渐变缓存：色标（alpha 128 档量化）签名未变就复用整条渐变对象，
           消掉每帧 320 次 createLinearGradient + 2560 次颜色串解析与 GC；
           场演化慢（噪声 t 系数 ≤0.21），签名绝大多数帧不变 */
        var gradCache = [];
        var gradEpoch = 0;                     /* 尺寸/档位/主题变化 → 整体作废 */
        var sigA = new Uint8Array(8);
        var alphaStr = [];
        for (var ai = 0; ai < 128; ai++) { alphaStr.push((ai / 127).toFixed(3)); }
        function sigEq(a, b, n) {
          for (var q = 0; q < n; q++) { if (a[q] !== b[q]) { return false; } }
          return true;
        }

        function resize() {
          /* 必须用 clientWidth/Height（不含滚动条）：innerWidth 含滚动条宽，
             画布会比内容面板宽出一截，面板圆角裁切的右上角就错位到滚动条
             底下（左角对齐、右角对不上的根源） */
          cssW = document.documentElement.clientWidth || window.innerWidth;
          cssH = document.documentElement.clientHeight || window.innerHeight;
          /* 面积感知 DPR（每次重排重算：换屏 / 缩放都会变）：
             后备像素 = W×H×dpr²，clear/合成/描边光栅全随像素数线性涨，
             4K 全屏是填充率悬崖 —— 超预算压 DPR，下限 0.85（1.2× 放大
             对发丝线的柔化肉眼难辨）；小屏 / 正常屏完全不受影响 */
          var baseDpr = Math.min(window.devicePixelRatio || 1, 2);
          var dprCap = Math.sqrt(PIXEL_BUDGET / Math.max(cssW * cssH, 1));
          dpr = Math.max(0.85, Math.min(baseDpr, dprCap) * TIER_DPR[tier]);
          dpr = Math.round(dpr * 100) / 100;
          canvas.width = Math.round(cssW * dpr);
          canvas.height = Math.round(cssH * dpr);
          canvas.style.width = cssW + "px";
          canvas.style.height = cssH + "px";
          canvas.style.marginBottom = -cssH + "px";  /* sticky 画布不占文档流（与 CSS 负 margin 一致） */
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          /* 密度：约每 7.5px 一条细竖线（窄屏 10px，上限 320 条兼顾性能），
             低画质档按线距倍率稀释线数。材料域 = 视口宽 + 两侧过盈 X_PAD*2，
             线条均匀铺满整个材料域 */
          var SPACING = (cssW < 700 ? 10 : 7.5) * TIER_SPACING[tier];
          var spanW = cssW + X_PAD * 2;
          LINES = Math.max(48, Math.min(320, Math.round(spanW / SPACING)));
          LINES = Math.round((LINES - 1) / 3) * 3 + 1;   /* 对齐粗网格 */
          SAMPLES = cssW < 700 ? TIER_SAMP_M[tier] : TIER_SAMP_D[tier];
          spacing = spanW / (LINES - 1);
          GW = (LINES - 1) / 3 + 1;
          GH = SAMPLES / 2 + 1;
          grid = new Float64Array(GW * GH);
          fineX = new Float64Array(LINES * (SAMPLES + 1));
          yAt = new Float64Array(SAMPLES + 1);
          var ySpanR = cssH + WAVE_PAD * 2;
          for (var q = 0; q <= SAMPLES; q++) { yAt[q] = (q / SAMPLES) * ySpanR - WAVE_PAD; }
          keyBendGrid = new Float64Array(KEYS * GH);
          bendGrid = new Float64Array(LINES * GH);
          blendK = new Float64Array(LINES * 2);
          tiltArr = new Float64Array(LINES);

          /* 关键线位置：等距 + 随机抖动（前后向钳制保次序，端点固定贴边） */
          var keyIdx = new Float64Array(KEYS);
          var slot = (LINES - 1) / (KEYS - 1);
          keyIdx[0] = 0;
          keyIdx[KEYS - 1] = LINES - 1;
          for (var k = 1; k < KEYS - 1; k++) {
            keyIdx[k] = k * slot + noise(k * 3.7 + 1234, 0.71, 0) * KEY_JITTER * slot;
          }
          var minSlot = 0.45 * slot;
          for (var k2 = 1; k2 < KEYS; k2++) {
            if (keyIdx[k2] < keyIdx[k2 - 1] + minSlot) { keyIdx[k2] = keyIdx[k2 - 1] + minSlot; }
          }
          for (var k3 = KEYS - 2; k3 >= 0; k3--) {
            if (keyIdx[k3] > keyIdx[k3 + 1] - minSlot) { keyIdx[k3] = keyIdx[k3 + 1] - minSlot; }
          }

          /* 关键线静态倾角（±KEY_TILT×1.8，随机角度人格） */
          var keyTilt = new Float64Array(KEYS);
          for (var kt = 0; kt < KEYS; kt++) {
            keyTilt[kt] = noise(kt * 1.7 + 900, 0.37, 0) * KEY_TILT * 1.8;
          }

          /* 每线人格 = 相邻关键线人格的 smootherstep 混插（C1，无棱角） */
          for (var m = 0; m < LINES; m++) {
            var k0 = 0;
            while (k0 < KEYS - 2 && m > keyIdx[k0 + 1]) { k0++; }
            var f = (m - keyIdx[k0]) / (keyIdx[k0 + 1] - keyIdx[k0]);
            if (f < 0) { f = 0; } else if (f > 1) { f = 1; }
            var w = f * f * f * (f * (6 * f - 15) + 10);
            blendK[m * 2] = k0;
            blendK[m * 2 + 1] = w;
            tiltArr[m] = keyTilt[k0] * (1 - w) + keyTilt[k0 + 1] * w;
          }

          /* 尺寸/档位变化 → 渐变缓存整体作废（渐变几何依赖 cssH） */
          gradEpoch++;
          gradCache.length = 0;
        }

        /* 尺寸变化防抖 140ms —— 移动端地址栏收放会连发 resize，
           频繁重建画布缓冲（重建即清空）是闪烁/抖动源之一；
           重建后同步渲一帧，零空窗 */
        var resizeTimer = 0;
        window.addEventListener("resize", function () {
          if (resizeTimer) { window.clearTimeout(resizeTimer); }
          resizeTimer = window.setTimeout(function () {
            resizeTimer = 0;
            resize();
            draw(performance.now());
          }, 140);
        }, { passive: true });

        window.addEventListener("scroll", function () {
          /* 波线背景以 0.12 倍速漂移 —— 与前景卡片形成层级视差。
             背景运动与滚动/触点持续绑定（同一手势同时驱动页面滑动与
             背景扭曲），任何滚动（触控拖动/滚轮）期间背景都不许冻结 */
          scrollDrift = (window.scrollY || 0) * 0.12;
        }, { passive: true });

        function addRipple(x, y) {
          if (reduceMotion) return;
          ripples.push({ x: x, y: y, born: performance.now() });
          if (ripples.length > 5) { ripples.shift(); }
        }

        /* ---- 指针追踪（鼠标 / 触控笔） ---- */
        window.addEventListener("pointermove", function (e) {
          /* 触屏不走透镜（见下方触控段）：移动端不做滑动跟手扭曲 */
          if (e.pointerType === "touch") return;
          mouse.tx = e.clientX;
          mouse.ty = e.clientY;
          mouse.inside = true;
        }, { passive: true });
        window.addEventListener("pointerleave", function () {
          mouse.inside = false;
        }, { passive: true });
        window.addEventListener("pointerdown", function (e) {
          /* 鼠标/触控笔点击 → 扩散圆圈（与透镜扰动共存） */
          if (e.pointerType === "touch") return;
          addRipple(e.clientX, e.clientY);
        }, { passive: true });

        /* ---- 触屏：仅轻点扩散圆圈（滚动手势判定重写）----
           轻点三重判据，权威判据是"页面是否真的滚动了"：
           ① touchstart 记录 scrollY，touchend 时 scrollY 变化 > 2px
              即滚动手势，绝不触发波纹 —— 旧版只比起终点位移，绕回式
              拖动（拉下又拉回）会在滚动途中误炸圆圈；
           ② 累积位移（touchmove 全程测量）< 14px，不再用起终点直线
              距离（起点→绕回→起点的净位移是 0，会漏判）；
           ③ 320ms 内、全程单指（多指/捏合一律放弃判定）。
           触摸事件流只做测量、全部 passive，不干预滚动；
           touchcancel（系统接管手势）只清状态、不触发 */
        var tapInfo = null;
        window.addEventListener("touchstart", function (e) {
          if (e.touches.length === 1) {
            tapInfo = {
              x: e.touches[0].clientX, y: e.touches[0].clientY,
              t: performance.now(),
              y0: window.scrollY || 0,
              maxMove: 0
            };
          } else { tapInfo = null; }
        }, { passive: true });
        window.addEventListener("touchmove", function (e) {
          if (!tapInfo) return;
          if (e.touches.length !== 1) { tapInfo = null; return; }
          var m = Math.abs(e.touches[0].clientX - tapInfo.x) + Math.abs(e.touches[0].clientY - tapInfo.y);
          if (m > tapInfo.maxMove) { tapInfo.maxMove = m; }
        }, { passive: true });
        function onTouchEnd(e) {
          if (!e.touches.length && tapInfo) {
            var scrolled = Math.abs((window.scrollY || 0) - tapInfo.y0) > 2;
            if (!scrolled && tapInfo.maxMove < 14 && performance.now() - tapInfo.t < 320) {
              addRipple(tapInfo.x, tapInfo.y);
            }
            tapInfo = null;
          }
        }
        window.addEventListener("touchend", onTouchEnd, { passive: true });
        window.addEventListener("touchcancel", function () { tapInfo = null; }, { passive: true });

        function hexToRgb(hex) {
          var h = (hex || "").trim().replace("#", "");
          if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
          var n = parseInt(h, 16);
          if (isNaN(n)) return [115, 92, 12];
          return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }

        /* 主题色缓存 0.5s —— 避免每帧 getComputedStyle 拖慢渲染 */
        var colorCache = null, colorCacheT = -1e9, colorThemeKey = "";
        function readThemeColors(now) {
          var key = (document.documentElement.getAttribute("data-theme") || "") + "|" +
                    document.documentElement.style.getPropertyValue("--md-sys-color-primary");
          if (colorCache && key === colorThemeKey && now - colorCacheT < 500) return colorCache;
          var cs = window.getComputedStyle(document.documentElement);
          colorCache = {
            a: hexToRgb(cs.getPropertyValue("--md-sys-color-primary")),
            b: hexToRgb(cs.getPropertyValue("--md-sys-color-tertiary"))
          };
          colorCacheT = now;
          colorThemeKey = key;
          gradEpoch++;                     /* 主题色变了：渐变缓存整体作废 */
          return colorCache;
        }

        var t0 = performance.now();
        var running = false;

        function draw(now) {
          var t = (now - t0) / 1000;
          var colors = readThemeColors(now);
          var isDark = document.documentElement.getAttribute("data-theme") === "dark";

          /* 跟随：仅鼠标/触控笔，柔和跟手（0.12）；
             透镜强度缓入缓出 —— 移出后原位渐隐（power→0），
             不再飞离画面又跳回，消除反复移动时的乱抖 */
          var followK = 0.12;
          mouse.x += (mouse.tx - mouse.x) * followK;
          mouse.y += (mouse.ty - mouse.y) * followK;
          mouse.power += ((mouse.inside ? 1 : 0) - mouse.power) * (mouse.inside ? 0.2 : 0.07);
          if (mouse.power < 0.02) { mouse.x = mouse.tx; mouse.y = mouse.ty; }

          /* 清理过期扩散圆圈（寿命 1.4s） */
          if (ripples.length) {
            var alive = [];
            for (var rp = 0; rp < ripples.length; rp++) {
              if (now - ripples[rp].born < 1400) { alive.push(ripples[rp]); }
            }
            ripples = alive;
          }

          var i, s, k;
          var ySpan = cssH + WAVE_PAD * 2;

          /* 画布 sticky 顶边的视口坐标 cTop：面板顶边还在视口内时随面板
             （heroH - scrollY），面板顶边升出视口后恒钉视口顶（0）。
             关键事实（第三十五轮实测修正）：画布 margin-bottom:-cssH 使
             sticky 元素 margin box 高度为 0 —— 浏览器永不把它向回推，
             页面尽头（footer 露出、加入区）同样钉在视口顶；旧版按
             "被面板下缘回推 footerH"计算 clamp，页底透镜判定整体偏移
             footer 高度。鼠标/涟漪是视口坐标，换算到画布本地 y 对准 */
          var sheetTopVp = heroH - (window.scrollY || 0);
          var cTop = sheetTopVp > 0 ? sheetTopVp : 0;

          /* 1) 粗网格求位移场：每 3 条线 × 每 2 个采样求值一次
             + 关键线弯曲锚混插到每线（相邻关键线 smootherstep） */
          for (var gj = 0; gj < GH; gj++) {
            var yG = yAt[Math.min(gj * 2, SAMPLES)];
            var wy = yG + scrollDrift;
            for (var gi = 0; gi < GW; gi++) {
              grid[gj * GW + gi] = fieldOffset(Math.min(gi * 3, LINES - 1) * spacing - X_PAD, wy, t);
            }
            for (k = 0; k < KEYS; k++) {
              keyBendGrid[k * GH + gj] = keyBend(k, wy, t);
            }
            for (var bi = 0; bi < LINES; bi++) {
              var k0b = blendK[bi * 2], wb = blendK[bi * 2 + 1];
              bendGrid[bi * GH + gj] = keyBendGrid[k0b * GH + gj] * (1 - wb)
                                     + keyBendGrid[(k0b + 1) * GH + gj] * wb;
            }
          }

          /* 2) 插值到细网格 + 高斯透镜 + 扩散圆圈
             x 向线性、y 向 Catmull-Rom 三次插值 —— 跨粗网格行导数连续，
             消除线性插值在行界的折角。
             快路径：透镜静默且无涟漪时整段特效跳过（每帧 1.8 万点
             少两次平方和 + Math.sqrt/exp 与涟漪环遍历） */
          var fxOn = mouse.power > 0.01;
          var rpN = ripples.length;
          for (i = 0; i < LINES; i++) {
            var iGH = i * GH;
            var fx = i / 3;
            var gi0 = fx | 0;
            if (gi0 > GW - 2) { gi0 = GW - 2; }
            var tx = fx - gi0;           /* 均匀列距：线号份额 = 材料坐标份额 */
            for (s = 0; s <= SAMPLES; s++) {
              var y = yAt[s];
              var fy = s / 2;
              var gj0 = fy | 0;
              if (gj0 > GH - 2) { gj0 = GH - 2; }
              var ty = fy - gj0;
              var jm = gj0 > 0 ? gj0 - 1 : 0;
              var jp = gj0 + 2 < GH ? gj0 + 2 : GH - 1;
              var x0 = i * spacing - X_PAD;   /* 材料域左缘在 -X_PAD（水平过盈） */
              var a0 = grid[jm * GW + gi0] + (grid[jm * GW + gi0 + 1] - grid[jm * GW + gi0]) * tx;
              var a1 = grid[gj0 * GW + gi0] + (grid[gj0 * GW + gi0 + 1] - grid[gj0 * GW + gi0]) * tx;
              var a2 = grid[(gj0 + 1) * GW + gi0] + (grid[(gj0 + 1) * GW + gi0 + 1] - grid[(gj0 + 1) * GW + gi0]) * tx;
              var a3 = grid[jp * GW + gi0] + (grid[jp * GW + gi0 + 1] - grid[jp * GW + gi0]) * tx;
              var ty2 = ty * ty, ty3 = ty2 * ty;
              var off = 0.5 * (2 * a1 + (-a0 + a2) * ty +
                (2 * a0 - 5 * a1 + 4 * a2 - a3) * ty2 + (-a0 + 3 * a1 - 3 * a2 + a3) * ty3);
              /* 关键线混插弯曲（Catmull-Rom y 插值，衔接处无折角）
                 + 静态倾角（关键线人格沿 x 平滑过渡） */
              var b0 = bendGrid[iGH + jm], b1 = bendGrid[iGH + gj0],
                  b2 = bendGrid[iGH + gj0 + 1], b3 = bendGrid[iGH + jp];
              var bend = 0.5 * (2 * b1 + (-b0 + b2) * ty +
                (2 * b0 - 5 * b1 + 4 * b2 - b3) * ty2 + (-b0 + 3 * b1 - 3 * b2 + b3) * ty3);
              var x = x0 + off + bend + tiltArr[i] * (y - cssH * 0.5);

              if (fxOn || rpN) {
                /* 高斯透镜：62px 峰值推力、R=240px，全域平滑衰减、无截断边界
                   （任何硬截断都会在边界产生棱角）× power 缓入缓出 */
                var dx = x - mouse.x, dy = y - (mouse.y - cTop);
                var d2 = dx * dx + dy * dy;
                if (d2 < 265225 && fxOn) {
                  var dd = Math.sqrt(d2) || 1;
                  x += (dx / dd) * 62 * Math.exp(-d2 / 57600) * mouse.power;
                }

                /* 扩散圆圈：环带以曲线速率（easeOutCubic）外扩，
                   经过处把线条径向推开 26px —— 与透镜扰动共存 */
                for (var rp2 = 0; rp2 < rpN; rp2++) {
                  var R = ripples[rp2];
                  var age = (now - R.born) / 1400;
                  var rr = 340 * (1 - (1 - age) * (1 - age) * (1 - age));
                  var ex = x - R.x, ey = y - (R.y - cTop);
                  var e2 = ex * ex + ey * ey;
                  var reach = rr + 100;
                  if (e2 > reach * reach || e2 < 0.01) { continue; }
                  var ed = Math.sqrt(e2);
                  var w2 = ed - rr;
                  x += (ex / ed) * 26 * Math.exp(-(w2 * w2) / 1800) * (1 - age);
                }
              }

              fineX[i * (SAMPLES + 1) + s] = x;
            }
          }

          /* 3) 逐线描边：局部疏密 → 亮度渐变，密度带即亮带；
             关键线混插让疏密呼吸贯穿全页，亮带自然流动（密度驱动），
             无单根重点线。渐变对象按色标签名缓存复用（见 gradCache）：
             签名（alpha 128 档量化）未变就不重建渐变 */
          ctx.clearRect(0, 0, cssW, cssH);
          var baseAlpha = isDark ? 0.22 : 0.16;   /* 浅色再降一档，不干扰黑字可读性 */
          var STOPS = TIER_STOPS[tier];
          for (i = 0; i < LINES; i++) {
            var mixT = i / (LINES - 1);
            var r = Math.round(colors.a[0] * (1 - mixT) + colors.b[0] * mixT);
            var g = Math.round(colors.a[1] * (1 - mixT) + colors.b[1] * mixT);
            var b = Math.round(colors.a[2] * (1 - mixT) + colors.b[2] * mixT);

            for (k = 0; k < STOPS; k++) {
              var sk = Math.round(k * SAMPLES / (STOPS - 1));
              var gap;
              if (i === 0) {
                gap = fineX[(SAMPLES + 1) + sk] - fineX[sk];
              } else if (i === LINES - 1) {
                gap = fineX[i * (SAMPLES + 1) + sk] - fineX[(i - 1) * (SAMPLES + 1) + sk];
              } else {
                gap = (fineX[(i + 1) * (SAMPLES + 1) + sk] - fineX[(i - 1) * (SAMPLES + 1) + sk]) / 2;
              }
              var density = spacing / Math.max(gap, 0.6);
              if (density > 3.2) { density = 3.2; } else if (density < 0.18) { density = 0.18; }
              var shade = 0.30 + 1.05 * Math.pow(density, 1.4);
              if (shade > 2.6) { shade = 2.6; }
              var a = baseAlpha * shade;
              if (a > 0.92) { a = 0.92; }
              var q = (a * 127 + 0.5) | 0;
              sigA[k] = q > 127 ? 127 : (q < 0 ? 0 : q);
            }

            var ent = gradCache[i];
            if (!ent || ent.epoch !== gradEpoch || ent.stops !== STOPS || !sigEq(ent.sig, sigA, STOPS)) {
              var grad = ctx.createLinearGradient(0, -WAVE_PAD, 0, cssH + WAVE_PAD);
              for (k = 0; k < STOPS; k++) {
                grad.addColorStop(k / (STOPS - 1), "rgba(" + r + "," + g + "," + b + "," + alphaStr[sigA[k]] + ")");
              }
              ent = { g: grad, sig: sigA.slice(0, STOPS), epoch: gradEpoch, stops: STOPS };
              gradCache[i] = ent;
            }

            ctx.strokeStyle = ent.g;
            ctx.lineWidth = 1;
            /* 二次贝塞尔中点平滑：采样点作控制点、段中点为曲线必经点，
               相邻段以中点连线为公共切线 → 全程 C1 连续，无折线棱角 */
            ctx.beginPath();
            var idx = i * (SAMPLES + 1);
            ctx.moveTo((fineX[idx] + fineX[idx + 1]) / 2, (yAt[0] + yAt[1]) / 2);
            for (s = 1; s < SAMPLES; s++) {
              ctx.quadraticCurveTo(
                fineX[idx + s], yAt[s],
                (fineX[idx + s] + fineX[idx + s + 1]) / 2, (yAt[s] + yAt[s + 1]) / 2
              );
            }
            ctx.lineTo(fineX[idx + SAMPLES], yAt[SAMPLES]);
            ctx.stroke();
          }
        }

        /* 渲染循环：draw 只负责画一帧；loop 独占 rAF 链，避免叉链。
           背景持续运动、与手势实时绑定 —— 滚动期间照常重绘（不冻结）。
           帧预算监督（自适应画质）：draw 耗时 + 帧间隔双信号，超阈逐档
           减负、有余量逐档回升（1.5s 冷却防振荡；起跑 3s 内 350ms 快速
           定档，保守 WebView 在首屏就能落到合适档位）。
           画布被封面完全盖住（面板整块在视口下方）时按 3 帧 1 画
           保温（省 2/3 空转），但不暂停测量 —— 定档在滚进内容区之前
           就完成 */
        var drawEMA = 6, dtEMA = 16, lastT = 0, frameNo = 0, tierT = -1e9, bornT = 0;
        function adaptTier(now) {
          if (now - tierT <= (now - bornT < 3000 ? 350 : 1500)) { return false; }
          var next = tier;
          if (drawEMA > 8.5 || (dtEMA > 29 && drawEMA > 3)) {
            next = Math.min(3, tier + 1);
          } else if (tier > 0 && drawEMA < 4.5 && dtEMA < 22) {
            next = tier - 1;
          }
          if (next === tier) { return false; }
          tier = next;
          tierT = now;
          resize();                      /* 档位变 → 缓冲重建（清空） */
          return true;
        }
        function loop(now) {
          if (lastT) {
            var dt = now - lastT;
            if (dt > 0 && dt < 400) { dtEMA += (dt - dtEMA) * 0.1; }  /* 剔除切后台大间隔 */
          }
          lastT = now;
          frameNo++;
          if (!bornT) { bornT = now; }
          var rebuilt = adaptTier(now);
          /* 面板还整块在视口下方（封面全遮、画布不可见）→ 3 帧 1 画
             保温；否则按档位抽帧 */
          var covered = (heroH - (window.scrollY || 0)) >= cssH;
          var cadence = covered ? 3 : TIER_SKIP[tier];
          if (rebuilt || (frameNo % cadence) === 0) {
            var t1 = performance.now();
            draw(now);
            drawEMA += (performance.now() - t1 - drawEMA) * 0.12;
          }
          if (!reduceMotion && running) { window.requestAnimationFrame(loop); }
        }

        resize();
        if (reduceMotion) {
          /* 静态一帧：保留氛围底纹，不做动画 */
          draw(t0 + 16);
        } else {
          running = true;
          window.requestAnimationFrame(loop);
        }
      })();

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
        }, 200); /* 退场 = --md-sys-motion-expressive-effects-default（200ms） */
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
