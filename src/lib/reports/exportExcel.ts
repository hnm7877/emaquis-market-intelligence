import type { ReportSection } from './buildReport';

/** Nom de feuille Excel valide (31 caractères, sans : \ / ? * [ ]) */
const sheetName = (s: string, used: Set<string>) => {
  const base = s.replace(/[:\\/?*[\]]/g, ' ').slice(0, 28).trim() || 'Feuille';
  let name = base;
  for (let i = 2; used.has(name); i++) name = `${base} ${i}`;
  used.add(name);
  return name;
};

/** Texte neutralisé : une cellule ne commence jamais par = + - @ (injection de formule) */
const safe = (v: string | number | null) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

/**
 * Classeur Excel : une feuille « Synthèse » (chiffres clés et constats) puis une feuille par tableau.
 * exceljs est chargé seulement ici (au clic) pour ne pas alourdir la page.
 */
export async function exportReportExcel(title: string, meta: string[], sections: ReportSection[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'E-Maquis Market Intelligence';
  wb.created = new Date();
  const used = new Set<string>();

  const summary = wb.addWorksheet(sheetName('Synthèse', used));
  summary.columns = [{ width: 36 }, { width: 28 }, { width: 22 }];
  summary.addRow([safe(title)]).font = { bold: true, size: 16, color: { argb: 'FFEA580C' } };
  meta.forEach((m) => summary.addRow([safe(m)]).font = { italic: true, color: { argb: 'FF6B7280' } });
  for (const s of sections) {
    summary.addRow([]);
    summary.addRow([s.title]).font = { bold: true, size: 13 };
    s.kpis.forEach((k) => summary.addRow([k.label, safe(k.value), safe(k.hint ?? '')]));
    s.highlights.forEach((h) => summary.addRow([safe(`• ${h}`)]));
  }

  for (const s of sections) {
    if (!s.table?.rows.length) continue;
    const ws = wb.addWorksheet(sheetName(s.title, used));
    const header = ws.addRow(s.table.columns);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }));
    s.table.rows.forEach((r, i) => {
      const row = ws.addRow(r.map(safe));
      if (s.table?.highlight?.[i]) row.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } }));
    });
    ws.columns.forEach((col, i) => {
      const lens = [s.table!.columns[i], ...s.table!.rows.map((r) => r[i])].map((v) => String(v ?? '').length);
      col.width = Math.min(40, Math.max(10, ...lens) + 2);
      if (i > 0) col.numFmt = '#,##0.##';
    });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nom de fichier sûr : lettres, chiffres, tirets */
export const fileSlug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase() || 'rapport';
