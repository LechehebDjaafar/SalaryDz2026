(function () {
  "use strict";

  // TODO: بدّل هذا برابط مستودعك الحقيقي على GitHub بعد الرفع — نقطة تعديل وحيدة
  const REPO_URL = "https://github.com/USERNAME/salarydz";
  const PENDING_KEY = "salarydz:pending-submissions";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Full list of Algeria's 58 wilayas + remote work, used to populate the contribution form
  // regardless of which wilayas already have data.
  const ALL_WILAYAS = [
    ["01","أدرار"],["02","الشلف"],["03","الأغواط"],["04","أم البواقي"],["05","باتنة"],
    ["06","بجاية"],["07","بسكرة"],["08","بشار"],["09","بليدة"],["10","البويرة"],
    ["11","تمنراست"],["12","تبسة"],["13","تلمسان"],["14","تيارت"],["15","تيزي وزو"],
    ["16","الجزائر"],["17","الجلفة"],["18","جيجل"],["19","سطيف"],["20","سعيدة"],
    ["21","سكيكدة"],["22","سيدي بلعباس"],["23","عنابة"],["24","قالمة"],["25","قسنطينة"],
    ["26","المدية"],["27","مستغانم"],["28","المسيلة"],["29","معسكر"],["30","ورقلة"],
    ["31","وهران"],["32","البيض"],["33","إليزي"],["34","برج بوعريريج"],["35","بومرداس"],
    ["36","الطارف"],["37","تندوف"],["38","تيسمسيلت"],["39","الوادي"],["40","خنشلة"],
    ["41","سوق أهراس"],["42","تيبازة"],["43","ميلة"],["44","عين الدفلى"],["45","النعامة"],
    ["46","عين تيموشنت"],["47","غرداية"],["48","غليزان"],["49","تيميمون"],
    ["50","برج باجي مختار"],["51","أولاد جلال"],["52","بني عباس"],["53","عين صالح"],
    ["54","عين قزام"],["55","تقرت"],["56","جانت"],["57","المغير"],["58","المنيعة"],
    ["00","عن بعد"],
  ];

  let DATA = [];
  let chart = null;

  const els = {
    grid: document.getElementById("grid"),
    meta: document.getElementById("results-meta"),
    search: document.getElementById("f-search"),
    wilaya: document.getElementById("f-wilaya"),
    typeGroup: document.getElementById("f-type"),
    sort: document.getElementById("f-sort"),
    statCount: document.getElementById("stat-count"),
    statWilayas: document.getElementById("stat-wilayas"),
    statJobs: document.getElementById("stat-jobs"),
    form: document.getElementById("contribute-form"),
    cJobAr: document.getElementById("c-job-ar"),
    cJobEn: document.getElementById("c-job-en"),
    cWilaya: document.getElementById("c-wilaya"),
    cExp: document.getElementById("c-exp"),
    cMin: document.getElementById("c-min"),
    cMax: document.getElementById("c-max"),
    cTypeGroup: document.getElementById("c-type"),
    cfError: document.getElementById("cf-error"),
    cfSuccess: document.getElementById("cf-success"),
    issueLink: document.getElementById("issue-link"),
    copyJsonBtn: document.getElementById("copy-json"),
    clearPendingBtn: document.getElementById("clear-pending"),
    lastUpdated: document.getElementById("last-updated"),
  };
  let activeType = "";
  let activeContribType = "خاص";
  let lastSubmittedEntry = null;

  // stagger delays for the hero reveal sequence
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    el.style.setProperty("--i", el.dataset.reveal);
  });

  document.getElementById("repo-link").href = REPO_URL;
  const rawJsonLink = document.getElementById("raw-json-link");
  if (rawJsonLink) rawJsonLink.href = REPO_URL + "/blob/main/salaries.json";

  populateFormWilayaSelect();

  fetch("salaries.json")
    .then((r) => r.json())
    .then((data) => {
      DATA = mergePending(data);
      populateWilayaFilter(DATA);
      animateStats(DATA);
      render();
      renderChart(DATA);
      initNetworkMap([...new Set(DATA.map((d) => d.wilaya_code))]);
      updateLastUpdated(data); // based on officially-merged data only, not local pending entries
    })
    .catch(() => {
      els.grid.innerHTML =
        '<div class="empty">تعذر تحميل البيانات. إذا كنت تفتح الملف محليا، شغّل خادم بسيط (مثلا: python -m http.server) لأن المتصفح يمنع قراءة JSON مباشرة من نظام الملفات.</div>';
    });

  function populateFormWilayaSelect() {
    if (!els.cWilaya) return;
    ALL_WILAYAS.forEach(([code, name]) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.dataset.name = name;
      opt.textContent = `${code} — ${name}`;
      els.cWilaya.appendChild(opt);
    });
  }

  function updateLastUpdated(officialData) {
    if (!els.lastUpdated || !officialData.length) return;
    const latest = officialData.reduce((max, d) => (d.date_added > max ? d.date_added : max), officialData[0].date_added);
    els.lastUpdated.textContent = `آخر تحديث رسمي: ${latest}`;
  }

  function loadPending() {
    try {
      return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function savePending(list) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch {}
  }

  function mergePending(officialData) {
    const pending = loadPending().map((d) => ({ ...d, __pending: true }));
    return [...pending, ...officialData];
  }

  function populateWilayaFilter(data) {
    const seen = new Map();
    data.forEach((d) => seen.set(d.wilaya_code, d.wilaya));
    [...seen.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([code, name]) => {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = `${code} — ${name}`;
        els.wilaya.appendChild(opt);
      });
  }

  function countUp(el, target, duration) {
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function animateStats(data) {
    countUp(els.statCount, data.length, 1100);
    countUp(els.statWilayas, new Set(data.map((d) => d.wilaya_code)).size, 1100);
    countUp(els.statJobs, new Set(data.map((d) => d.job_title)).size, 1100);
  }

  function currentFilters() {
    return {
      q: els.search.value.trim().toLowerCase(),
      wilaya: els.wilaya.value,
      type: activeType,
      sort: els.sort.value,
    };
  }

  function applyFilters() {
    const f = currentFilters();
    let rows = DATA.filter((d) => {
      if (f.wilaya && d.wilaya_code !== f.wilaya) return false;
      if (f.type && d.company_type !== f.type) return false;
      if (f.q) {
        const hay = (d.job_title + " " + d.job_title_en).toLowerCase();
        if (!hay.includes(f.q)) return false;
      }
      return true;
    });

    if (f.sort === "salary-desc") rows.sort((a, b) => avg(b) - avg(a));
    else if (f.sort === "salary-asc") rows.sort((a, b) => avg(a) - avg(b));
    else rows.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));

    return rows;
  }

  function avg(d) { return (d.salary_min + d.salary_max) / 2; }
  function fmt(n) { return new Intl.NumberFormat("ar-DZ").format(n); }

  function render() {
    const rows = applyFilters();
    els.meta.textContent = `${rows.length} نتيجة من أصل ${DATA.length}`;

    if (!rows.length) {
      els.grid.innerHTML = '<div class="empty">ماكاش نتائج تطابق البحث. جرب تبدل الفلاتر.</div>';
      return;
    }

    els.grid.innerHTML = rows.map(cardHTML).join("");
    attachTilt();
  }

  function cardHTML(d, i) {
    return `
      <article class="stub${d.__pending ? " is-pending" : ""}" style="--i:${i}">
        ${d.__pending ? '<span class="pending-badge mono">بانتظار المراجعة</span>' : ""}
        <div class="stub-top">
          <div>
            <div class="stub-job">${escapeHTML(d.job_title)}</div>
            <div class="stub-job-en">${escapeHTML(d.job_title_en)}</div>
          </div>
          <div class="wilaya-badge" title="${escapeHTML(d.wilaya)}">${escapeHTML(d.wilaya_code)}</div>
        </div>
        <div class="stub-wilaya-name">${escapeHTML(d.wilaya)} · خبرة ${d.experience_years} سنوات</div>
        <div class="stub-divider"></div>
        <div class="stub-salary">${fmt(d.salary_min)} – ${fmt(d.salary_max)} <small>دج/شهر</small></div>
        <div class="stub-foot">
          <span class="tag">${escapeHTML(d.company_type)}</span>
          <span>${escapeHTML(d.date_added)}</span>
        </div>
      </article>`;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // subtle 3D tilt on hover, skipped for touch / reduced motion
  function attachTilt() {
    if (reduceMotion || matchMedia("(hover: none)").matches) return;
    document.querySelectorAll(".stub").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(600px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  function renderChart(data) {
    const byJob = {};
    data.forEach((d) => {
      byJob[d.job_title] = byJob[d.job_title] || [];
      byJob[d.job_title].push(avg(d));
    });
    const entries = Object.entries(byJob)
      .map(([job, vals]) => [job, vals.reduce((a, b) => a + b, 0) / vals.length])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const ctx = document.getElementById("salaryChart");
    const g = ctx.getContext("2d");
    const chartWidth = ctx.getBoundingClientRect().width || 700;
    const gradient = g.createLinearGradient(0, 0, chartWidth, 0);
    gradient.addColorStop(0, "#35E0A6");
    gradient.addColorStop(1, "#F0B94D");

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [{
          data: entries.map((e) => Math.round(e[1])),
          backgroundColor: gradient,
          borderRadius: 8,
          barThickness: 22,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion ? false : { duration: 900, easing: "easeOutQuart" },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.08)" },
            ticks: { color: "#9FB6AC", font: { family: "JetBrains Mono", size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: { color: "#F2F7F4", font: { family: "Tajawal", size: 12 } },
          },
        },
      },
    });
  }

  els.search.addEventListener("input", render);
  els.wilaya.addEventListener("input", render);
  els.sort.addEventListener("input", render);
  els.typeGroup.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    els.typeGroup.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeType = btn.dataset.value;
    render();
  });

  // ===== Contribution form =====
  if (els.cTypeGroup) {
    els.cTypeGroup.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg-btn");
      if (!btn) return;
      els.cTypeGroup.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      activeContribType = btn.dataset.value;
    });
  }

  if (els.form) {
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      els.cfError.textContent = "";

      const jobAr = els.cJobAr.value.trim();
      const jobEn = els.cJobEn.value.trim() || jobAr;
      const wilayaOpt = els.cWilaya.selectedOptions[0];
      const exp = Number(els.cExp.value);
      const smin = Number(els.cMin.value);
      const smax = Number(els.cMax.value);

      if (!jobAr) return showFormError("دخل اسم المهنة بالعربية.");
      if (!wilayaOpt || !wilayaOpt.value) return showFormError("اختر الولاية.");
      if (!Number.isFinite(exp) || exp < 0) return showFormError("سنوات الخبرة لازم تكون رقم موجب.");
      if (!smin || !smax) return showFormError("دخل أقل وأعلى راتب.");
      if (smin > smax) return showFormError("أقل راتب لازم يكون أصغر من أعلى راتب.");
      if (smin < 15000 || smax > 2000000) return showFormError("قيمة الراتب خارجة عن النطاق المعقول.");

      const entry = {
        job_title: jobAr,
        job_title_en: jobEn,
        wilaya: wilayaOpt.dataset.name,
        wilaya_code: wilayaOpt.value,
        experience_years: exp,
        salary_min: smin,
        salary_max: smax,
        company_type: activeContribType,
        date_added: new Date().toISOString().slice(0, 10),
      };

      const pending = loadPending();
      pending.unshift(entry);
      savePending(pending);
      lastSubmittedEntry = entry;

      DATA = [{ ...entry, __pending: true }, ...DATA];
      animateStats(DATA);
      render();
      renderChart(DATA);

      buildIssueLink(entry);
      els.cfSuccess.hidden = false;
      els.cfSuccess.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  }

  function showFormError(msg) {
    els.cfError.textContent = msg;
  }

  function buildIssueLink(entry) {
    if (!els.issueLink) return;
    const title = `تصريح راتب: ${entry.job_title} — ${entry.wilaya}`;
    const body = [
      "تصريح راتب جديد لدمجه في salaries.json:",
      "",
      "```json",
      JSON.stringify(entry, null, 2),
      "```",
    ].join("\n");
    const url = `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=data-submission`;
    els.issueLink.href = url;
  }

  if (els.copyJsonBtn) {
    els.copyJsonBtn.addEventListener("click", async () => {
      if (!lastSubmittedEntry) return;
      const text = JSON.stringify(lastSubmittedEntry, null, 2);
      try {
        await navigator.clipboard.writeText(text);
        els.copyJsonBtn.textContent = "✓ اتنسخ";
        setTimeout(() => (els.copyJsonBtn.textContent = "انسخ JSON"), 1600);
      } catch {
        showFormError("تعذر النسخ التلقائي — انسخ من صندوق الكود تحت.");
      }
    });
  }

  if (els.clearPendingBtn) {
    els.clearPendingBtn.addEventListener("click", () => {
      savePending([]);
      DATA = DATA.filter((d) => !d.__pending);
      animateStats(DATA);
      render();
      renderChart(DATA);
      els.cfSuccess.hidden = true;
      lastSubmittedEntry = null;
    });
  }

  // ===== Scroll reveal for panels =====
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal-on-scroll").forEach((el) => io.observe(el));

  // ===== Wilaya network map (hero signature element) =====
  // Approximate relative positions (0-1) within Algeria's silhouette.
  // Decorative data-art, not a precise geographic reference.
  const WILAYA_COORDS = {
    "01": [0.25, 0.68], "02": [0.32, 0.18], "03": [0.45, 0.45], "04": [0.62, 0.30],
    "05": [0.58, 0.33], "06": [0.52, 0.12], "07": [0.57, 0.42], "08": [0.15, 0.55],
    "09": [0.44, 0.15], "10": [0.46, 0.20], "11": [0.35, 0.92], "12": [0.68, 0.35],
    "13": [0.14, 0.20], "14": [0.35, 0.28], "15": [0.48, 0.13], "16": [0.43, 0.11],
    "17": [0.44, 0.38], "18": [0.55, 0.13], "19": [0.56, 0.24], "20": [0.27, 0.32],
    "21": [0.58, 0.15], "22": [0.20, 0.24], "23": [0.68, 0.13], "24": [0.64, 0.20],
    "25": [0.60, 0.20], "26": [0.42, 0.22], "27": [0.24, 0.16], "28": [0.50, 0.34],
    "29": [0.25, 0.25], "30": [0.52, 0.58], "31": [0.18, 0.18], "32": [0.28, 0.48],
    "33": [0.72, 0.65], "34": [0.53, 0.26], "35": [0.46, 0.12], "36": [0.72, 0.14],
    "37": [0.04, 0.62], "38": [0.34, 0.24], "39": [0.60, 0.55], "40": [0.63, 0.32],
    "41": [0.66, 0.24], "42": [0.39, 0.13], "43": [0.58, 0.22], "44": [0.38, 0.20],
    "45": [0.22, 0.38], "46": [0.16, 0.22], "47": [0.44, 0.52], "48": [0.28, 0.20],
    "55": [0.55, 0.52],
  };

  function initNetworkMap(codes) {
    const canvas = document.getElementById("netmap");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, DPR;
    let nodes = [];
    let floating = null;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildNodes();
    }

    function buildNodes() {
      nodes = [];
      codes.forEach((code) => {
        if (code === "00") return; // remote work handled as floating node
        const pos = WILAYA_COORDS[code];
        if (!pos) return;
        nodes.push({
          x: pos[0] * W,
          y: pos[1] * H * 0.9 + H * 0.05,
          r: 2 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
        });
      });
      if (codes.includes("00")) {
        floating = { x: W * 0.85, y: H * 0.18, r: 3, phase: 0 };
      }
    }

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);

      // connections: nearest-neighbour-ish links for a network feel
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < Math.min(W, H) * 0.16) {
            const alpha = 0.10 * (1 - d / (Math.min(W, H) * 0.16));
            ctx.strokeStyle = `rgba(53,224,166,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        if (floating) {
          ctx.strokeStyle = "rgba(240,185,77,0.06)";
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(floating.x, floating.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      nodes.forEach((n) => {
        const glow = 0.55 + 0.45 * Math.sin(t * 0.02 + n.phase);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + glow * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,185,77,${0.35 * glow})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(242,247,244,${0.55 + 0.3 * glow})`;
        ctx.fill();
      });

      if (floating) {
        const glow = 0.6 + 0.4 * Math.sin(t * 0.03);
        ctx.beginPath();
        ctx.arc(floating.x, floating.y, floating.r + glow * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,110,88,${0.35 * glow})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(floating.x, floating.y, floating.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,110,88,0.85)";
        ctx.fill();
      }

      t++;
      if (!reduceMotion) requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
  }
})();
