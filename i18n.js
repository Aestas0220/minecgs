(function () {
  "use strict";
  // Keys retain the original Chinese copy; text nodes preserve icons and emphasis.
  var english = {
    "校园建筑复刻": "CAMPUS RECONSTRUCTION",
    "始于 2024": "EST. 2024",
    "下滑": "Scroll",
    "MineCGS —— 以 1:2 比例在 Minecraft 中严谨复刻广东碧桂园学校校园的学生自发项目。": "MineCGS is a student-led project faithfully recreating the campus of Guangdong Country Garden School (GCGS) in Minecraft at a 1:2 scale.",
    "跳至项目简介": "Skip to project overview",
    "MineCGS 首页": "MineCGS home",
    "切换深浅色模式": "Toggle light and dark mode",
    "切换为浅色模式": "Switch to light mode",
    "切换为深色模式": "Switch to dark mode",
    "主导航": "Main navigation",
    "首屏": "Home",
    "简介": "About",
    "进度": "Progress",
    "加入": "Join",
    "广东碧桂园学校": "Guangdong Country Garden School",
    "Minecraft 复刻企划": "Minecraft Reconstruction",
    "语言": "Language",
    "浏览档案": "Explore the project",
    "下载进服包": "Download modpack",
    "加入我们": "Join us",
    "Modrinth 轻量包（约 324KB）：拖入 PCL 等 Java 版启动器，自动安装 MC 26.2 + Fabric 0.19.5 与全部模组、配置和服务器地址": "Lightweight Modrinth pack (about 324KB): import it into a Java Edition launcher such as PCL to automatically install MC 26.2, Fabric 0.19.5, all mods, settings and the server address.",
    "MineCGS-进服包-MC26.2-Fabric0.19.5.mrpack": "MineCGS-Modpack-MC26.2-Fabric0.19.5.mrpack",
    "项目简介": "Project overview",
    "把母校建进 Minecraft": "Recreating our school in Minecraft",
    "MineCGS 是一项始于 2024 年 9 月的校园建筑复刻工程：以": "MineCGS is a campus architecture reconstruction project that began in September 2024. It faithfully recreates Guangdong Country Garden School in Minecraft at a ",
    "1:2 比例": "1:2 scale",
    "在 Minecraft 中严谨重建广东碧桂园学校，两格方块对应现实中的一米。项目起源于一次突发奇想，2026 学年重启后持续推进。": ", with two blocks representing one metre in real life. Born from a spontaneous idea, the project resumed in the 2026 academic year and continues to develop.",
    "建模以 Google Earth 高清卫星图为底图，投射到超平坦地形上作为平面基准；其余数据来自现场测绘——拍照、量取尺寸，记录每栋建筑的轴线、层高与立面做法，再逐块在游戏中对齐。": "High-resolution Google Earth satellite imagery is projected onto superflat terrain to establish the plan reference. The remaining data comes from on-site surveys: taking photographs, measuring dimensions, and recording each building's grid lines, floor-to-floor heights and facade construction, then aligning them block by block in Minecraft.",
    "1:2 的尺度意味着持续的换算与取舍，也让许多平日被忽略的细节进入记录——不同年代翻新留下的墙面色差、连廊的宽度、台阶的高度。这座校园的形体与它的细节，都将在 Minecraft 中被一并留存。": "Working at a 1:2 scale involves constant conversion and trade-offs. It also brings often-overlooked details into the record: differences in wall colour left by renovations from different periods, corridor widths and step heights. Both the campus's forms and its details will be preserved in Minecraft.",
    "本项目由学生自发发起，与学校官方无关。": "This is an independent, student-led project and is not affiliated with the school administration.",
    "项目规格": "Project specifications",
    "当前游戏版本": "Minecraft version",
    "服务端": "Server software",
    "建造工具": "Building tools",
    "当前进度": "Current progress",
    "地图预览": "Map preview",
    "内嵌地图预览，可以直接在网页里漫游已经建好的部分。可拖动旋转、滚轮缩放；若浏览器鼠标手势占用右键，按住 Alt+左键拖动即可旋转视角。": "Explore the completed areas directly in the embedded map. Drag to rotate and use the scroll wheel to zoom. If your browser's mouse gestures use the right mouse button, hold Alt and drag with the left mouse button to rotate the view.",
    "全屏预览地图": "View map in fullscreen",
    "全屏预览": "Enter fullscreen",
    "退出全屏预览": "Exit fullscreen map preview",
    "退出全屏": "Exit fullscreen",
    "MineCGS 校园地图预览": "MineCGS campus map preview",
    "在新窗口打开地图": "Open the map in a new window",
    "。": ".",
    "建造进度": "Construction progress",
    "保守估算的完成度，建造清单随后续测绘持续更新。": "A conservative estimate of completion. The construction checklist is updated as further surveys are carried out.",
    "整体建造进度": "Overall construction progress",
    "建造清单": "Construction checklist",
    "11 项 · 2 项已完成": "11 items · 2 completed",
    "按状态筛选建造清单": "Filter the construction checklist by status",
    "全部": "All",
    "已完成": "Completed",
    "未完成": "Incomplete",
    "在建中": "In progress",
    "待建": "Planned",
    "大门 · 外立面": "Main gate · exterior",
    "行政楼 · 外立面": "Administration building · exterior",
    "小学部": "Primary school",
    "初中部": "Junior secondary school",
    "山体": "Hill terrain",
    "AP 楼": "AP building",
    "国际高中楼": "International high school building",
    "少年宫": "Youth activity centre",
    "两个操场": "Two sports grounds",
    "剧院": "Theatre",
    "宿舍": "Dormitories",
    "与我们一起建造": "Build with us",
    "测绘、建模、归档，每个环节都缺人。": "Surveying, modelling and archiving: help is needed at every stage.",
    "参与方式": "How to take part",
    "申请主要看": "Applications are assessed mainly on ",
    "建筑功底": "building skills",
    "或": " or ",
    "相关经验": "relevant experience",
    "，发几张自己的作品照片即可。": ". Simply send a few photographs of your own work.",
    "若您拥有激光雷达、无人机等设备可辅助勘测，也欢迎与我们联系。": "If you have equipment such as LiDAR scanners or drones that could help with surveying, we would also welcome hearing from you.",
    "加入前我们会简单聊聊，双方都觉得合适再给管理员权限。": "Before you join, we will have a brief chat. Administrator permissions will be granted once both sides feel it is a good fit.",
    "联系方式": "Contact",
    "微信账号": "WeChat ID",
    "开源致谢": "Open-source credits",
    "本站使用的开源项目": "Open-source projects used on this site",
    "地图预览引擎": "Map preview engine",
    "下载前须知": "Before you download",
    "本进服包仅供课余时间游玩。因上课时间游玩、在校园内违规使用电子产品等行为所导致的一切后果，概不负责。": "This modpack is intended for use outside class time only. The project accepts no responsibility for any consequences of playing during lessons, using electronic devices in violation of school rules, or similar conduct.",
    "请阅读以上须知，3 秒后可确认": "Please read the notice above. Confirmation unlocks in 3s.",
    "请阅读以上须知，{seconds} 秒后可确认": "Please read the notice above. Confirmation unlocks in {seconds}s.",
    "倒计时结束，现在可以确认下载": "You can now confirm the download.",
    "取消": "Cancel",
    "我已知晓，下载mrpack": "I understand · Download mrpack"
  };
  var language = "zh";
  var root = document.documentElement;
  var textEntries = [], attributeEntries = [];
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var node;
  while ((node = walker.nextNode())) {
    if (!node.parentElement || node.parentElement.closest("script, style, svg, .language-switch")) continue;
    var source = node.nodeValue.trim();
    if (Object.prototype.hasOwnProperty.call(english, source)) {
      textEntries.push({ node: node, source: source, original: node.nodeValue });
    }
  }
  ["aria-label", "title", "download"].forEach(function (name) {
    document.querySelectorAll("[" + name + "]").forEach(function (el) {
      var source = el.getAttribute(name);
      if (Object.prototype.hasOwnProperty.call(english, source)) attributeEntries.push({ el: el, name: name, source: source });
    });
  });
  var description = document.querySelector('meta[name="description"]');
  if (description) attributeEntries.push({ el: description, name: "content", source: description.content });
  var choices = Array.prototype.slice.call(document.querySelectorAll(".language-switch__choice"));
  var group = document.querySelector(".language-switch");
  function t(source, parameters) {
    var value = language === "en" && Object.prototype.hasOwnProperty.call(english, source) ? english[source] : source;
    return value.replace(/\{(\w+)\}/g, function (match, key) { return parameters && parameters[key] !== undefined ? parameters[key] : match; });
  }
  function setLanguage(next, announce) {
    language = next === "en" ? "en" : "zh";
    root.lang = language === "en" ? "en" : "zh-CN";
    textEntries.forEach(function (entry) { entry.node.nodeValue = language === "en" ? t(entry.source) : entry.original; });
    attributeEntries.forEach(function (entry) { entry.el.setAttribute(entry.name, t(entry.source)); });
    document.querySelectorAll(".hero__school-compact").forEach(function (el) { el.textContent = language === "en" ? "GCGS" : "广东碧桂园学校"; });
    choices.forEach(function (choice) {
      var selected = choice.getAttribute("data-language") === language;
      choice.setAttribute("aria-checked", selected ? "true" : "false");
      choice.tabIndex = selected ? 0 : -1;
    });
    if (group) group.setAttribute("aria-label", t("语言"));
    try { localStorage.setItem("gcgs-language", language); } catch (e) {}
    if (announce) document.dispatchEvent(new CustomEvent("minecgs:languagechange", { detail: { language: language } }));
  }
  choices.forEach(function (choice, index) {
    choice.addEventListener("click", function () { setLanguage(choice.getAttribute("data-language"), true); });
    choice.addEventListener("keydown", function (e) {
      var next;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % choices.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index + choices.length - 1) % choices.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = choices.length - 1;
      else return;
      e.preventDefault();
      setLanguage(choices[next].getAttribute("data-language"), true);
      choices[next].focus();
    });
  });
  window.MineCGSI18n = { t: t, setLanguage: setLanguage, getLanguage: function () { return language; } };
  var saved;
  try { saved = localStorage.getItem("gcgs-language"); } catch (e) {}
  setLanguage(saved, false);
})();
