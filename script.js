(function () {
  "use strict";

  let DATA = [];
  let chart = null;

  const els = {
    grid: document.getElementById("grid"),
    meta: document.getElementById("results-meta"),
    search: document.getElementById("f-search"),
    wilaya: document.getElementById("f-wilaya"),
    type: document.getElementById("f-type"),
    sort: document.getElementById("f-sort"),
    statCount: document.getElementById("stat-count"),
    statWilayas: document.getElementById("stat-wilayas"),
    statJobs: document.getElementById("stat-jobs"),
  };

  fetch("salaries.json")
    .then((r) => r.json())
    .then((data) => {
      DATA = data;
      populateWilayaFilter(data);
      updateStats(data);
      render();
      renderChart(data);
    })
    .catch(() => {
      els.grid.innerHTML =
        '<div class="empty">تعذر تحميل البيانات. إذا كنت تفتح الملف محليا، شغّل خادم بسيط (مثلا: python -m http.server) لأن المتصفح يمنع قراءة JSON مباشرة من نظام الملفات.</div>';
    });

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

  function updateStats(data) {
    els.statCount.textContent = data.length;
    els.statWilayas.textContent = new Set(data.map((d) => d.wilaya_code)).size;
    els.statJobs.textContent = new Set(data.map((d) => d.job_title)).size;
  }

  function currentFilters() {
    return {
      q: els.search.value.trim().toLowerCase(),
      wilaya: els.wilaya.value,
      type: els.type.value,
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

    if (f.sort === "salary-desc") {
      rows.sort((a, b) => avg(b) - avg(a));
    } else if (f.sort === "salary-asc") {
      rows.sort((a, b) => avg(a) - avg(b));
    } else {
      rows.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
    }
    return rows;
  }

  function avg(d) {
    return (d.salary_min + d.salary_max) / 2;
  }

  function fmt(n) {
    return new Intl.NumberFormat("ar-DZ").format(n);
  }

  function render() {
    const rows = applyFilters();
    els.meta.textContent = `${rows.length} نتيجة من أصل ${DATA.length}`;

    if (!rows.length) {
      els.grid.innerHTML = '<div class="empty">ماكاش نتائج تطابق البحث. جرب تبدل الفلاتر.</div>';
      return;
    }

    els.grid.innerHTML = rows.map(cardHTML).join("");
  }

  function cardHTML(d) {
    return `
      <article class="stub">
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
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [{
          data: entries.map((e) => Math.round(e[1])),
          backgroundColor: "#A3392C",
          borderRadius: 2,
          barThickness: 22,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: "#C7BCA2" }, ticks: { color: "#57635E", font: { family: "IBM Plex Mono" } } },
          y: { grid: { display: false }, ticks: { color: "#1E2A2A", font: { family: "IBM Plex Sans Arabic" } } },
        },
      },
    });
  }

  [els.search, els.wilaya, els.type, els.sort].forEach((el) =>
    el.addEventListener("input", render)
  );
})();
