// =====================
// Konfigurasi File JSON
// =====================
export const LABELS_JSON = "label_covid.json";
export const RULES_JSON  = "rule_covid_cf.json";

// =====================
// Fungsi Loader JSON
// =====================
export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Gagal memuat ${path} (${res.status})`);
  return await res.json();
}

// =====================
// ===== CF Helpers =====
// =====================

/** Kombinasi dua nilai CF (rumus CF Combine) */
export function cfCombine(a, b) {
  return a + b * (1 - a);
}

/** Evaluasi satu rule (semua premis harus terpenuhi → AND semantics) */
export function evaluateRule(rule, userCF) {
  const vals = [];
  for (const p of rule.if) {
    const u = userCF[p.gejala] ?? 0;
    if (u <= 0) return { then: rule.then, value: 0 }; // jika satu gejala tidak, hasil 0
    vals.push(u * p.cf);
  }
  if (!vals.length) return { then: rule.then, value: 0 };

  // Gabungkan semua nilai premis
  let c = vals[0];
  for (let i = 1; i < vals.length; i++) c = cfCombine(c, vals[i]);

  // Kalikan dengan CF aturan utama
  return { then: rule.then, value: c * (rule.cf ?? 1) };
}

/** Gabungkan hasil antar-rule menuju penyakit sama (paralel) */
export function diagnose(rules, userCF) {
  const agg = {};
  for (const r of rules) {
    const { then, value } = evaluateRule(r, userCF);
    if (value > 0)
      agg[then] = agg[then] == null ? value : cfCombine(agg[then], value);
  }
  return Object.entries(agg).sort((a, b) => b[1] - a[1]); // urut desc
}

/** Urutkan kode gejala berdasar angka di dalam string (misal: GJL01..GJL18) */
export function orderedCodes(symptoms) {
  const toNum = s => parseInt(String(s).replace(/\D/g, "")) || 0;
  return Object.keys(symptoms).sort((a, b) => toNum(a) - toNum(b));
}

/** Map indeks 1..5 -> nilai CF user berdasarkan certainty_terms */
export function indexToCFMap(certaintyTerms) {
  const order = ["Tidak", "Kemungkinan Tidak", "Tidak Tahu", "Kemungkinan Iya", "Iya"];
  return {
    order,
    values: order.map(k => Number(certaintyTerms[k]))
  };
}
