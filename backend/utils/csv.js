// RFC 4180 CSV: quoted fields may hold commas, quotes ("") and line breaks.
// Letterboxd and IMDb exports are UTF-8 with or without a BOM, CRLF or LF.

/** Parses CSV text into an array of rows (arrays of strings). Blank lines are skipped. */
function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === '') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

/** Rows as objects keyed by the header row (trimmed). */
function parseCsvObjects(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return { header: [], records: [] };
  const keys = header.map((h) => h.trim());
  return {
    header: keys,
    records: rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()]))),
  };
}

function quote(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // a leading = + - @ would run as a formula in a spreadsheet
  const safe = /^[=+\-@]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Serializes rows (arrays) to CSV with CRLF line ends and a BOM, which Excel needs for UTF-8. */
function toCsv(rows) {
  return `﻿${rows.map((r) => r.map(quote).join(',')).join('\r\n')}\r\n`;
}

module.exports = { parseCsv, parseCsvObjects, toCsv };
