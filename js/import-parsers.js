// ============================================================
// IMPORT PARSERS — Excel (SheetJS), Word (Mammoth), PDF (PDF.js)
// Semua parsing dilakukan di BROWSER (client-side).
// Backend hanya menerima array hasil parsing yang sudah bersih.
// ============================================================

// --- Excel (.xlsx/.xls) ---
async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  // Asumsi format: kolom A = nomor soal, kolom B = jawaban (A/B/C/D)
  return rows
    .filter(r => r[0] !== undefined && r[0] !== '' && !isNaN(Number(r[0])))
    .map(r => ({ nomor: Number(r[0]), jawaban: String(r[1] || '').trim().toUpperCase() }));
}

// --- Word (.doc/.docx) via Mammoth → ekstrak teks lalu parse pola "1. A" / "1 A" / "1) A" ---
async function parseWordFile(file) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return parseTextToAnswers(result.value);
}

// --- PDF via PDF.js → ekstrak teks lalu parse pola yang sama ---
async function parsePdfFile(file) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(it => it.str).join(' ') + '\n';
  }
  return parseTextToAnswers(fullText);
}

// Parser teks umum: mencari pola "1. A", "1) B", "1 - C", "1: D", dst
function parseTextToAnswers(text) {
  const results = [];
  const regex = /(\d{1,3})\s*[.\-):]\s*([A-E])\b/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push({ nomor: Number(match[1]), jawaban: match[2].toUpperCase() });
  }
  // Hilangkan duplikat nomor (ambil kemunculan pertama)
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.nomor)) return false;
    seen.add(r.nomor);
    return true;
  }).sort((a, b) => a.nomor - b.nomor);
}

// --- Dispatcher utama untuk Kunci Jawaban ---
async function parseKunciJawabanFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return parseExcelFile(file);
  if (ext === 'doc' || ext === 'docx') return parseWordFile(file);
  if (ext === 'pdf') return parsePdfFile(file);
  throw new Error('Format file tidak didukung. Gunakan Excel, Word, atau PDF.');
}

// --- Dispatcher untuk Data Siswa (Excel/CSV: kolom nama, absen, kelas) ---
async function parseSiswaFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  return rows
    .filter((r, i) => i > 0 && r[0]) // lewati header, pastikan ada nama
    .map(r => ({ namaSiswa: String(r[0] || ''), nomorAbsen: String(r[1] || ''), kelas: String(r[2] || '') }));
}

// --- Export ke Excel (dipakai di halaman Kunci Jawaban & Riwayat) ---
function exportToExcel(data, filename, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
