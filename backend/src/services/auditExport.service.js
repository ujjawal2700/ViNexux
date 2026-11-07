import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { AUDIT_RETENTION_DAYS } from '../../../shared/dataRetention.js';
import { AppError } from '../utils/AppError.js';
import { fileURLToPath } from 'node:url';
import { auditDateTime, auditSectionLabel, auditStatusLabel } from '../../../shared/auditPresentation.js';

const assets = fileURLToPath(new URL('../assets/pos/', import.meta.url));
export function auditReportParagraphs(logs, filters, generatedAt = new Date()) {
  const paragraphs = [
    { style: 'Title', text: 'ViNexus Admin Activity Report' },
    { text: 'A record of who changed your website and business records, the items affected, and their previous and new values. All dates and times are in Indian Standard Time (IST).' },
    { text: `Generated: ${auditDateTime(generatedAt)}` },
    { text: `Only the last ${AUDIT_RETENTION_DAYS} days of activity are retained.` },
    { style: 'Heading1', text: 'Report filters' },
    { text: `Dates: ${filters.from ? auditDateTime(filters.from) : 'Any start date'} to ${filters.to ? auditDateTime(filters.to) : 'Any end date'}` },
    { text: `Daily time window: ${filters.startTime || '00:00'} to ${filters.endTime || '23:59'} IST${filters.startTime && filters.endTime && filters.startTime > filters.endTime ? ' (overnight)' : ''}` },
    { text: `Section: ${filters.section ? auditSectionLabel(filters.section) : 'All sections'} | Status: ${filters.status ? auditStatusLabel(filters.status) : 'All statuses'}` },
    { text: `Search: ${filters.search || 'None'}${filters.actorId ? ` | Account filter: ${logs.find(log => String(log.actor?.id) === filters.actorId)?.display?.actor || filters.actorId}` : ''}` },
    { style: 'Heading1', text: 'Activity summary' },
    { text: `${logs.length} matching ${logs.length === 1 ? 'entry' : 'entries'}. Administrators: ${new Set(logs.map(log => log.actor?.id || log.actor?.email || log.display.actor)).size}. Record changes: ${logs.reduce((sum, log) => sum + log.display.records.length, 0)}. Entries are listed newest first. This report includes all matching entries, not just the current screen page.` },
  ];
  if (!logs.length) paragraphs.push({ text: 'No activity matches the selected filters.' });
  logs.forEach((log, index) => {
    const view = log.display;
    paragraphs.push({ style: 'Heading1', text: `Activity ${index + 1}` },
      { text: `${view.actor}${view.email ? ` (${view.email})` : ''} | ${view.role}`, keepNext: true },
      { text: `${view.time} | ${view.section} | ${view.status}`, keepNext: true },
      { text: log.location?.status === 'available' ? `Location: ${log.location.latitude}, ${log.location.longitude} (browser-reported)` : 'Location: Not available', keepNext: true },
      ...(view.records.length > 1 ? [{ text: view.summary }] : []));
    for (const record of view.records) {
      paragraphs.push({ style: 'Heading2', text: `${record.action} ${record.label}` });
      if (!record.changes.length) paragraphs.push({ text: 'No further field details were recorded.' });
      for (const change of record.changes) paragraphs.push({ style: 'Heading3', text: change.field }, { text: `Before: ${change.before}`, keepNext: true }, { text: `After: ${change.after}` });
    }
  });
  return paragraphs;
}
export async function generateAuditPdf(logs, filters, generatedAt) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 48, right: 48, bottom: 54, left: 48 }, bufferPages: true,
    info: { Title: 'ViNexus Admin Activity Report', Author: 'ViNexus' } });
  doc.registerFont('regular', `${assets}LiberationSans-Regular.ttf`); doc.registerFont('bold', `${assets}LiberationSans-Bold.ttf`);
  const chunks = [];
  const completed = new Promise((resolve, reject) => { doc.on('data', data => chunks.push(data)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  for (const p of auditReportParagraphs(logs, filters, generatedAt)) {
    const heading = !!p.style;
    const requiredSpace = p.style === 'Heading1' && /^Activity \d+$/.test(p.text) ? 220 : 115;
    if (heading && doc.y > doc.page.height - requiredSpace) doc.addPage();
    doc.font(heading ? 'bold' : 'regular').fontSize(p.style === 'Title' ? 23 : p.style === 'Heading1' ? 16 : p.style === 'Heading2' ? 13 : 11)
      .fillColor(p.style === 'Title' ? '#111111' : heading ? '#800020' : '#263238')
      .text(p.text, { width: doc.page.width - 96, lineGap: 3, paragraphGap: heading ? 5 : 3 });
    doc.moveDown(heading ? 0.15 : 0.05);
  }
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom; doc.page.margins.bottom = 0;
    doc.font('regular').fontSize(9).fillColor('#667085');
    doc.text(`ViNexus | Admin activity | Page ${i + 1} of ${range.count}`, 48, doc.page.height - 36, { width: doc.page.width - 96, lineBreak: false, align: 'right' });
    doc.page.margins.bottom = bottom;
  }
  doc.end(); return completed;
}
const excelDate = value => new Date(new Date(value).getTime() + 330 * 60000);
const numericValue = (text, field) => {
  if (/price|amount|total|balance|quantity|stock|rate|percent|count|order|zoom|position/i.test(field)) {
    const normalized = String(text).replace(/^INR\s*/, '').replaceAll(',', '');
    if (/^-?\d+(?:\.\d+)?$/.test(normalized)) { const value = Number(normalized); if (Number.isFinite(value)) return value; }
  }
  return String(text);
};
export async function generateAuditExcel(logs, filters, generatedAt = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ViNexus'; workbook.created = generatedAt;
  workbook.calcProperties.fullCalcOnLoad = true;
  const make = (name, columns, title) => {
    const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 11, showGridLines: false }] });
    sheet.columns = columns.map(([key, width]) => ({ key, width }));
    const last = String.fromCharCode(64 + columns.length);
    const note = (row, text) => { sheet.mergeCells(`A${row}:${last}${row}`); sheet.getCell(`A${row}`).value = text; sheet.getRow(row).height = row === 1 ? 32 : 30; };
    note(1, title); sheet.getCell('A1').font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF111111' } };
    note(2, name === 'Activity' ? 'One row per activity. Open the Changes worksheet for individual field values.' : 'One row per field change. Entry numbers match the Activity worksheet.');
    note(3, `Generated: ${auditDateTime(generatedAt)}. Dates in the tables use IST and can be sorted in Excel.`);
    sheet.getCell('A4').value = 'Entries'; sheet.getCell('B4').value = logs.length; sheet.getRow(4).height = 22;
    note(5, `Dates: ${filters.from ? auditDateTime(filters.from) : 'Any start date'} to ${filters.to ? auditDateTime(filters.to) : 'Any end date'}`);
    note(6, `Daily time window: ${filters.startTime || '00:00'} to ${filters.endTime || '23:59'} IST${filters.startTime && filters.endTime && filters.startTime > filters.endTime ? ' (overnight)' : ''}`);
    note(7, `Section: ${filters.section ? auditSectionLabel(filters.section) : 'All sections'}. Result: ${filters.status ? auditStatusLabel(filters.status) : 'All results'}.`);
    note(8, `Search: ${filters.search || 'None'}${filters.actorId ? `; account: ${logs.find(log => String(log.actor?.id) === filters.actorId)?.display.actor || filters.actorId}` : ''}`);
    note(9, `Includes all matching screen pages. Only the last ${AUDIT_RETENTION_DAYS} days are retained.`);
    const header = sheet.getRow(11); header.values = columns.map(([key]) => key); header.height = 30;
    header.eachCell(cell => { cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800020' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 8, printTitlesRow: '11:11' };
    sheet.headerFooter.oddFooter = 'ViNexus admin activity report &RPage &P of &N';
    return sheet;
  };
  const activity = make('Activity', [['Entry', 9], ['When (IST)', 25], ['Administrator', 25], ['Email', 30], ['Role', 22], ['Section', 26], ['What changed', 55], ['Records', 12], ['Result', 15], ['Location', 27]], 'ViNexus Admin Activity Report');
  const changes = make('Changes', [['Entry', 9], ['When (IST)', 25], ['Administrator', 25], ['Record', 45], ['Action', 14], ['Field', 42], ['Before', 45], ['After', 45]], 'ViNexus Change Details');
  logs.forEach((log, index) => {
    const view = log.display, entry = index + 1, when = excelDate(log.createdAt);
    const location = log.location?.status === 'available' ? `${log.location.latitude}, ${log.location.longitude}` : 'Unavailable';
    activity.addRow([entry, when, view.actor, view.email, view.role, view.section, view.summary, view.recordCount ?? view.records.length, view.status, location]);
    for (const record of view.records) {
      for (const change of record.changes.length ? record.changes : [{ field: 'Details', before: 'Not recorded', after: 'No further field details were recorded' }]) {
        if (changes.rowCount >= 1048576) throw new AppError('This report exceeds Excel’s row limit. Narrow the filters and export again.', 413, 'REPORT_TOO_LARGE');
        if ([record.label, change.field, change.before, change.after].some(value => String(value).length > 32767)) throw new AppError('A recorded value is too long for an Excel cell. Use the PDF export for this selection.', 413, 'REPORT_TOO_LARGE');
        const row = changes.addRow([entry, when, view.actor, record.label, record.action, change.field, numericValue(change.before, change.field), numericValue(change.after, change.field)]);
        if (/price|amount|total|balance/i.test(change.field)) for (const column of [7, 8]) if (typeof row.getCell(column).value === 'number') row.getCell(column).numFmt = '"INR "#,##0.00;[Red]("INR "#,##0.00)';
      }
    }
  });
  for (const sheet of [activity, changes]) {
    sheet.autoFilter = { from: { row: 11, column: 1 }, to: { row: Math.max(11, sheet.rowCount), column: sheet.columns.length } };
    sheet.getColumn(2).numFmt = 'dd-mmm-yyyy hh:mm AM/PM';
    sheet.getCell('B4').numFmt = '0';
    sheet.eachRow((row, n) => {
      if (n === 11) return;
      row.eachCell(cell => {
        if (n !== 1) cell.font = { name: 'Arial', size: 11 };
        cell.alignment = { vertical: 'top', wrapText: true, ...(n > 11 ? { horizontal: typeof cell.value === 'number' || cell.value instanceof Date ? 'right' : 'left', indent: 1 } : {}) };
        if (n > 11 && n % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F3F4' } };
      });
      if (n > 11) {
        let lines = 2;
        row.eachCell((cell, column) => { if (typeof cell.value === 'string') lines = Math.max(lines, ...cell.value.split('\n').map(text => Math.ceil(text.length / Math.max(8, sheet.getColumn(column).width - 2)))); });
        row.height = Math.min(409, Math.max(40, lines * 14 + 8));
      }
    });
  }
  return workbook.xlsx.writeBuffer();
}
