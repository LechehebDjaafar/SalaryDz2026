// Validates salaries.json structure before a PR can be merged.
const fs = require("fs");

const REQUIRED_FIELDS = [
  "job_title", "job_title_en", "wilaya", "wilaya_code",
  "experience_years", "salary_min", "salary_max",
  "company_type", "date_added",
];
const VALID_TYPES = ["خاص", "عمومي", "عن بعد"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fail(msg) {
  console.error("✗ " + msg);
  process.exitCode = 1;
}

let raw;
try {
  raw = fs.readFileSync("salaries.json", "utf8");
} catch (e) {
  fail("تعذر قراءة salaries.json: " + e.message);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  fail("salaries.json ليس JSON صالح: " + e.message);
  process.exit(1);
}

if (!Array.isArray(data)) {
  fail("salaries.json يجب أن يكون array.");
  process.exit(1);
}

data.forEach((entry, i) => {
  REQUIRED_FIELDS.forEach((f) => {
    if (!(f in entry)) fail(`السطر ${i}: حقل ناقص "${f}"`);
  });
  if (entry.wilaya_code && !/^\d{2}$/.test(entry.wilaya_code)) {
    fail(`السطر ${i}: wilaya_code يجب يكون رقمين (مثال: "16")`);
  }
  if (typeof entry.experience_years !== "number" || entry.experience_years < 0) {
    fail(`السطر ${i}: experience_years يجب يكون رقم موجب`);
  }
  if (typeof entry.salary_min !== "number" || typeof entry.salary_max !== "number") {
    fail(`السطر ${i}: salary_min/salary_max يجب يكونو أرقام`);
  } else if (entry.salary_min > entry.salary_max) {
    fail(`السطر ${i}: salary_min أكبر من salary_max`);
  } else if (entry.salary_min < 15000 || entry.salary_max > 2000000) {
    fail(`السطر ${i}: قيمة الراتب خارجة عن النطاق المعقول`);
  }
  if (!VALID_TYPES.includes(entry.company_type)) {
    fail(`السطر ${i}: company_type يجب يكون واحد من: ${VALID_TYPES.join(", ")}`);
  }
  if (!DATE_RE.test(entry.date_added)) {
    fail(`السطر ${i}: date_added يجب يكون بصيغة YYYY-MM-DD`);
  }
});

if (process.exitCode !== 1) {
  console.log(`✓ salaries.json صالح — ${data.length} تصريح راتب.`);
}
