// ============================================================
// APP.JS — Router SPA & Render Halaman
// ============================================================
let cachedMapel = [], cachedKunci = [], cachedSiswa = [];

// ============================================================
// INIT
// ============================================================
function initApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  document.getElementById('sidebar-user-name').textContent = currentUser.nama;
  document.getElementById('sidebar-user-role').textContent = currentUser.role === 'SuperAdmin' ? 'Super Admin' : 'Guru';
  document.getElementById('topbar-user').textContent = currentUser.nama + ' · ' + (currentUser.role === 'SuperAdmin' ? 'Super Admin' : 'Guru');

  if (currentUser.role === 'SuperAdmin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }

  initTheme();
  loadBrandingIntoUI();
  navigateTo(location.hash.replace('#', '') || 'dashboard');
  window.addEventListener('hashchange', () => navigateTo(location.hash.replace('#', '')));
}

document.addEventListener('DOMContentLoaded', () => {
  if (checkSession()) initApp();
});

// ============================================================
// THEME TOGGLE
// ============================================================
function initTheme() {
  const saved = localStorage.getItem('sc_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon();
}
document.getElementById('btn-theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sc_theme', next);
  updateThemeIcon();
});
function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.getElementById('btn-theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ============================================================
// ROUTER
// ============================================================
const PAGE_LOADERS = {
  dashboard: loadDashboard,
  mapel: loadMapel,
  kunci: loadKunci,
  pindai: loadPindai,
  siswa: loadSiswa,
  riwayat: loadRiwayat,
  laporan: loadLaporan,
  users: loadUsers,
  branding: loadBranding
};

function navigateTo(page) {
  if (!PAGE_LOADERS[page]) page = 'dashboard';
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.remove('hidden');
  document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  PAGE_LOADERS[page]();
}
document.querySelectorAll('.nav-item[data-page]').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); location.hash = link.dataset.page; });
});

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  const res = await apiGet('getDashboard');
  if (!res.success) return;
  const d = res.data;

  document.getElementById('dashboard-stats').innerHTML = `
    <div class="stat-card"><div class="icon">📄</div><div class="value">${d.totalDikoreksi}</div><div class="label">Total Lembar Dikoreksi</div></div>
    <div class="stat-card"><div class="icon">📊</div><div class="value">${d.rataRata}</div><div class="label">Rata-rata Nilai</div></div>
    <div class="stat-card"><div class="icon">🎓</div><div class="value">${d.tingkatKetuntasan}%</div><div class="label">Tingkat Ketuntasan</div></div>
    <div class="stat-card"><div class="icon">⚠️</div><div class="value">${d.perluVerifikasi}</div><div class="label">Perlu Verifikasi</div></div>
  `;

  document.getElementById('dashboard-chart').innerHTML = d.rataPerMapel.length
    ? d.rataPerMapel.map(m => `
      <div class="bar-chart-row">
        <span class="label">${m.namaMapel}</span>
        <div class="bar-track"><div class="bar-fill ${m.rataRata < 75 ? 'low' : ''}" style="width:${Math.min(m.rataRata, 100)}%"></div></div>
        <span class="value">${m.rataRata}</span>
      </div>`).join('')
    : '<p class="page-sub">Belum ada data.</p>';

  const tbody = document.querySelector('#dashboard-recent tbody');
  tbody.innerHTML = d.ujianTerbaru.length
    ? d.ujianTerbaru.map(h => `<tr><td>${h.nilai}</td><td>${statusBadge(h.statusVerifikasi)}</td><td>${formatDate(h.tanggal)}</td></tr>`).join('')
    : '<tr><td colspan="3">Belum ada ujian yang dikoreksi.</td></tr>';
}

// ============================================================
// MATA PELAJARAN
// ============================================================
let editingMapelId = null;

async function loadMapel() {
  const res = await apiGet('getMapel');
  if (!res.success) return;
  cachedMapel = res.data;
  const grid = document.getElementById('mapel-grid');
  grid.innerHTML = cachedMapel.map(m => `
    <div class="subject-card">
      <span>📘</span>
      <div class="subj-name">${m.namaMapel}</div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-outline btn-sm" onclick="openMapelModal('${m.id}','${escapeQ(m.namaMapel)}')">Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="removeMapel('${m.id}')">Hapus</button>
      </div>
    </div>`).join('') + `<div class="subject-card-add" id="btn-add-mapel-inline">+ Tambah Mapel</div>`;
  document.getElementById('btn-add-mapel-inline').addEventListener('click', () => openMapelModal());
}

function openMapelModal(id = null, namaLama = '') {
  editingMapelId = id;
  document.getElementById('modal-mapel-title').textContent = id ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran';
  document.getElementById('mapel-form-nama').value = namaLama;
  document.getElementById('modal-mapel').classList.remove('hidden');
}
function closeMapelModal() { document.getElementById('modal-mapel').classList.add('hidden'); }

document.getElementById('btn-add-mapel').addEventListener('click', () => openMapelModal());
document.getElementById('btn-close-modal-mapel').addEventListener('click', closeMapelModal);
document.getElementById('btn-cancel-mapel').addEventListener('click', closeMapelModal);

document.getElementById('btn-confirm-mapel').addEventListener('click', async () => {
  const namaMapel = document.getElementById('mapel-form-nama').value.trim();
  if (!namaMapel) return showToast('Nama mata pelajaran wajib diisi.', 'error');
  const res = await apiPost('saveMapel', editingMapelId ? { id: editingMapelId, namaMapel } : { namaMapel });
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) { closeMapelModal(); loadMapel(); }
});

async function removeMapel(id) {
  if (!confirm('Hapus mata pelajaran ini?')) return;
  const res = await apiPost('deleteMapel', { id });
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) loadMapel();
}

// ============================================================
// KUNCI JAWABAN — halaman penuh (builder selalu tampil, bukan modal)
// ============================================================
let manualAnswers = {};     // { nomor: 'A' }
let editingKunciId = null;

async function loadKunci() {
  const [kunciRes, mapelRes] = await Promise.all([
    apiGet('getKunciJawaban'),
    cachedMapel.length ? Promise.resolve({ data: cachedMapel }) : apiGet('getMapel')
  ]);
  if (!kunciRes.success) return;
  cachedKunci = kunciRes.data;
  cachedMapel = mapelRes.data;

  renderKunciTable(cachedKunci);
  document.getElementById('kunci-form-mapel').innerHTML = cachedMapel.length
    ? cachedMapel.map(m => `<option value="${m.id}">${m.namaMapel}</option>`).join('')
    : '<option value="">(Belum ada mata pelajaran — tambahkan dulu)</option>';

  resetKunciBuilder();
}

function renderKunciTable(data) {
  const mapelMap = {}; cachedMapel.forEach(m => mapelMap[m.id] = m.namaMapel);
  document.querySelector('#kunci-table tbody').innerHTML = data.length
    ? data.map(k => `
      <tr>
        <td>${k.namaUjian}</td>
        <td>${mapelMap[k.mapelId] || '-'}</td>
        <td>${k.kelas || '-'}</td>
        <td>${k.jumlahSoal}</td>
        <td class="btn-row">
          <button class="btn btn-outline btn-sm" onclick="editKunci('${k.id}')">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="removeKunci('${k.id}')">Hapus</button>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="5">Belum ada kunci jawaban tersimpan.</td></tr>';
}

document.getElementById('kunci-search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderKunciTable(cachedKunci.filter(k => k.namaUjian.toLowerCase().includes(q)));
});

// --- Reset builder untuk membuat paket baru ---
function resetKunciBuilder() {
  editingKunciId = null;
  manualAnswers = {};
  document.getElementById('builder-title').textContent = 'Buat Paket Kunci Baru';
  document.getElementById('kunci-form-nama').value = '';
  document.getElementById('kunci-form-kelas').value = '';
  document.getElementById('kunci-form-jumlah').value = 40;
  switchKunciTab('manual');
  renderManualMatrix();
  document.getElementById('import-success-banner').classList.add('hidden');
  updateBobotNilai();
}
document.getElementById('btn-new-kunci').addEventListener('click', resetKunciBuilder);
document.getElementById('btn-cancel-kunci').addEventListener('click', resetKunciBuilder);

// --- Edit paket yang sudah tersimpan: load ke builder ---
function editKunci(id) {
  const k = cachedKunci.find(x => x.id === id);
  if (!k) return;
  editingKunciId = id;
  document.getElementById('builder-title').textContent = 'Edit Paket: ' + k.namaUjian;
  document.getElementById('kunci-form-nama').value = k.namaUjian;
  document.getElementById('kunci-form-mapel').value = k.mapelId;
  document.getElementById('kunci-form-kelas').value = k.kelas || '';
  document.getElementById('kunci-form-jumlah').value = k.jumlahSoal;

  const kj = typeof k.kunciJawaban === 'string' ? JSON.parse(k.kunciJawaban) : k.kunciJawaban;
  manualAnswers = {};
  kj.forEach(j => manualAnswers[j.nomor] = j.jawaban);
  switchKunciTab('manual');
  renderManualMatrix();
  updateBobotNilai();
  document.getElementById('kunci-builder-card').scrollIntoView({ behavior: 'smooth' });
}

// --- Tab switching ---
function switchKunciTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('tab-manual').classList.toggle('hidden', tab !== 'manual');
  document.getElementById('tab-import').classList.toggle('hidden', tab !== 'import');
}
document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchKunciTab(btn.dataset.tab)));

// --- Matriks Kunci Jawaban (dipakai bersama oleh tab Manual & hasil Import) ---
document.getElementById('kunci-form-jumlah').addEventListener('input', () => { renderManualMatrix(); updateBobotNilai(); });

function renderManualMatrix() {
  const n = Number(document.getElementById('kunci-form-jumlah').value) || 0;
  document.getElementById('kunci-badge-soal').textContent = n + ' Soal Pilihan Ganda';
  const grid = document.getElementById('manual-matrix');
  let html = '';
  for (let i = 1; i <= n; i++) {
    html += `<div class="matrix-item"><span class="no">${String(i).padStart(2, '0')}</span>
      <div class="option-pills" data-nomor="${i}">
        ${['A', 'B', 'C', 'D'].map(opt => `<button type="button" class="option-pill ${manualAnswers[i] === opt ? 'selected' : ''}" data-opt="${opt}">${opt}</button>`).join('')}
      </div></div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('.option-pills').forEach(group => {
    group.addEventListener('click', e => {
      if (!e.target.classList.contains('option-pill')) return;
      const nomor = Number(group.dataset.nomor);
      group.querySelectorAll('.option-pill').forEach(p => p.classList.remove('selected'));
      e.target.classList.add('selected');
      manualAnswers[nomor] = e.target.dataset.opt;
      updateManualProgress();
    });
  });
  updateManualProgress();
}
function updateManualProgress() {
  const n = Number(document.getElementById('kunci-form-jumlah').value) || 0;
  const terisi = Object.keys(manualAnswers).length;
  document.getElementById('manual-progress').textContent = `${terisi} dari ${n} soal terisi`;
  document.getElementById('builder-status').textContent = terisi === n && n > 0
    ? '✓ Semua soal terisi, siap disimpan.'
    : `Isi ${n - terisi} soal lagi untuk melengkapi kunci jawaban.`;
}
document.getElementById('btn-reset-manual').addEventListener('click', () => { manualAnswers = {}; renderManualMatrix(); });

function updateBobotNilai() {
  const n = Number(document.getElementById('kunci-form-jumlah').value) || 0;
  document.getElementById('kunci-form-bobot').value = n ? Math.round((100 / n) * 100) / 100 : 0;
}

// --- Tab Import: dropzone fungsional, hasil langsung masuk ke Matriks yang sama ---
const importDropzone = document.getElementById('import-dropzone');
const importFileInput = document.getElementById('import-kunci-file');
importDropzone.addEventListener('click', () => importFileInput.click());
importDropzone.addEventListener('dragover', e => { e.preventDefault(); importDropzone.classList.add('dragover'); });
importDropzone.addEventListener('dragleave', () => importDropzone.classList.remove('dragover'));
importDropzone.addEventListener('drop', e => {
  e.preventDefault(); importDropzone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleKunciFileImport(e.dataTransfer.files[0]);
});
importFileInput.addEventListener('change', e => { if (e.target.files[0]) handleKunciFileImport(e.target.files[0]); });

async function handleKunciFileImport(file) {
  try {
    showToast('Membaca file ' + file.name + '...', 'info');
    const rows = await parseKunciJawabanFile(file);
    if (!rows.length) return showToast('Tidak ada jawaban yang terdeteksi. Pastikan format file sesuai panduan (contoh: "1. A").', 'error');

    manualAnswers = {};
    rows.forEach(r => manualAnswers[r.nomor] = r.jawaban);
    document.getElementById('kunci-form-jumlah').value = rows.length;
    renderManualMatrix();
    updateBobotNilai();

    document.getElementById('import-success-banner').classList.remove('hidden');
    document.getElementById('import-success-banner').innerHTML =
      `<span>✓ "${file.name}" berhasil diekstrak — ${rows.length} soal terdeteksi</span>`;
    showToast(rows.length + ' jawaban berhasil dibaca. Silakan periksa matriks di kanan sebelum disimpan.', 'success');
  } catch (err) {
    showToast('Gagal membaca file: ' + err.message, 'error');
  }
}

// --- Konfirmasi & Simpan ---
document.getElementById('btn-confirm-kunci').addEventListener('click', async () => {
  const namaUjian = document.getElementById('kunci-form-nama').value.trim();
  const mapelId = document.getElementById('kunci-form-mapel').value;
  const kelas = document.getElementById('kunci-form-kelas').value.trim();
  const jumlahSoal = Number(document.getElementById('kunci-form-jumlah').value);

  if (!namaUjian) return showToast('Nama paket ujian wajib diisi.', 'error');
  if (!mapelId) return showToast('Pilih mata pelajaran terlebih dahulu.', 'error');

  const kunciJawaban = Object.keys(manualAnswers).map(n => ({ nomor: Number(n), jawaban: manualAnswers[n] }));
  if (!kunciJawaban.length) return showToast('Belum ada kunci jawaban yang diisi (manual atau import).', 'error');

  const btn = document.getElementById('btn-confirm-kunci');
  showLoadingBtn(btn, 'Menyimpan...');
  const payload = { namaUjian, mapelId, kelas, jumlahSoal, kunciJawaban, bobotNilai: Math.round((100 / jumlahSoal) * 100) / 100 };
  if (editingKunciId) payload.id = editingKunciId;
  const res = await apiPost('saveKunciJawaban', payload);
  hideLoadingBtn(btn);

  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) loadKunci();
});

document.getElementById('btn-export-kunci').addEventListener('click', () => {
  if (!cachedKunci.length) return showToast('Tidak ada data untuk diekspor.', 'error');
  const flat = [];
  cachedKunci.forEach(k => {
    const kj = typeof k.kunciJawaban === 'string' ? JSON.parse(k.kunciJawaban) : k.kunciJawaban;
    kj.forEach(j => flat.push({ Ujian: k.namaUjian, Nomor: j.nomor, Jawaban: j.jawaban }));
  });
  exportToExcel(flat, 'kunci-jawaban.xlsx', 'Kunci Jawaban');
});

async function removeKunci(id) {
  if (!confirm('Hapus kunci jawaban ini?')) return;
  const res = await apiPost('deleteKunciJawaban', { id });
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) loadKunci();
}

// ============================================================
// PINDAI & KOREKSI
// ============================================================
async function loadPindai() {
  const [ujianRes, siswaRes] = await Promise.all([apiGet('getKunciJawaban'), apiGet('getSiswa')]);
  cachedKunci = ujianRes.data || [];
  cachedSiswa = siswaRes.data || [];

  document.getElementById('pindai-ujian').innerHTML = cachedKunci.map(k => `<option value="${k.id}">${k.namaUjian}</option>`).join('');
  document.getElementById('pindai-siswa').innerHTML = cachedSiswa.map(s => `<option value="${s.id}">${s.namaSiswa} (${s.kelas})</option>`).join('');

  renderAnswerGrid();
  document.getElementById('pindai-ujian').addEventListener('change', renderAnswerGrid);
}

function renderAnswerGrid() {
  const ujianId = document.getElementById('pindai-ujian').value;
  const ujian = cachedKunci.find(k => k.id === ujianId);
  const grid = document.getElementById('pindai-grid');
  if (!ujian) { grid.innerHTML = ''; return; }
  const n = ujian.jumlahSoal;
  let html = '';
  for (let i = 1; i <= n; i++) {
    html += `<div class="answer-item"><span>${i}</span>
      <select data-nomor="${i}">
        <option value="">-</option>
        <option value="A">A</option><option value="B">B</option>
        <option value="C">C</option><option value="D">D</option>
      </select></div>`;
  }
  grid.innerHTML = html;
}

document.getElementById('scan-dropzone').addEventListener('click', () => document.getElementById('scan-file').click());
document.getElementById('scan-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('scan-preview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
});

document.getElementById('btn-submit-koreksi').addEventListener('click', async () => {
  const ujianId = document.getElementById('pindai-ujian').value;
  const siswaId = document.getElementById('pindai-siswa').value;
  if (!ujianId || !siswaId) return showToast('Pilih ujian dan siswa terlebih dahulu.', 'error');

  const jawabanTerdeteksi = Array.from(document.querySelectorAll('#pindai-grid select')).map(sel => ({
    nomor: Number(sel.dataset.nomor),
    jawaban: sel.value,
    confidence: sel.value ? 1 : 0 // input manual dianggap confidence penuh jika diisi
  }));

  const btn = document.getElementById('btn-submit-koreksi');
  showLoadingBtn(btn, 'Menghitung...');
  const res = await apiPost('submitKoreksi', { ujianId, siswaId, jawabanTerdeteksi });
  hideLoadingBtn(btn);

  const resultEl = document.getElementById('pindai-result');
  if (res.success) {
    resultEl.className = '';
    resultEl.innerHTML = `
      <div class="card" style="background:var(--success-bg);border:none">
        <strong>Nilai Akhir: ${res.data.nilai}</strong><br>
        Benar: ${res.data.benar} · Salah: ${res.data.salah} · Kosong: ${res.data.kosong}<br>
        Status: ${statusBadge(res.data.statusVerifikasi)}
      </div>`;
    showToast('Koreksi berhasil disimpan!');
  } else {
    showToast(res.message, 'error');
  }
});

// ============================================================
// DATA SISWA
// ============================================================
async function loadSiswa() {
  const res = await apiGet('getSiswa');
  if (!res.success) return;
  cachedSiswa = res.data;
  renderSiswaTable(cachedSiswa);
}

function renderSiswaTable(data) {
  document.querySelector('#siswa-table tbody').innerHTML = data.length
    ? data.map(s => `
      <tr>
        <td>${s.namaSiswa}</td><td>${s.nomorAbsen}</td><td>${s.kelas}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="removeSiswa('${s.id}')">Hapus</button></td>
      </tr>`).join('')
    : '<tr><td colspan="4">Belum ada data siswa.</td></tr>';
}

document.getElementById('siswa-search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderSiswaTable(cachedSiswa.filter(s => s.namaSiswa.toLowerCase().includes(q)));
});

document.getElementById('btn-add-siswa').addEventListener('click', async () => {
  const namaSiswa = prompt('Nama siswa:');
  if (!namaSiswa) return;
  const nomorAbsen = prompt('Nomor absen:');
  const kelas = prompt('Kelas:');
  const res = await apiPost('saveSiswa', { namaSiswa, nomorAbsen, kelas });
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) loadSiswa();
});

document.getElementById('btn-import-siswa').addEventListener('click', () => document.getElementById('import-siswa-file').click());
document.getElementById('import-siswa-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const rows = await parseSiswaFile(file);
    const res = await apiPost('importSiswa', { rows });
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) loadSiswa();
  } catch (err) {
    showToast('Gagal membaca file: ' + err.message, 'error');
  }
});

async function removeSiswa(id) {
  if (!confirm('Hapus siswa ini?')) return;
  const res = await apiPost('deleteSiswa', { id });
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) loadSiswa();
}

// ============================================================
// RIWAYAT UJIAN
// ============================================================
let cachedRiwayat = [];
async function loadRiwayat() {
  const res = await apiGet('getRiwayat');
  if (!res.success) return;
  cachedRiwayat = res.data;

  const kelasSet = [...new Set(cachedRiwayat.map(r => r.kelas))];
  document.getElementById('riwayat-filter-kelas').innerHTML = '<option value="">Semua Kelas</option>' +
    kelasSet.map(k => `<option value="${k}">${k}</option>`).join('');

  renderRiwayatTable(cachedRiwayat);
}

function renderRiwayatTable(data) {
  document.querySelector('#riwayat-table tbody').innerHTML = data.length
    ? data.map(r => `
      <tr>
        <td>${r.namaSiswa}</td><td>${r.kelas}</td><td>${r.namaUjian}</td>
        <td>${r.jumlahBenar}</td><td>${r.jumlahSalah}</td><td>${r.jumlahKosong}</td>
        <td><strong>${r.nilai}</strong></td><td>${statusBadge(r.statusVerifikasi)}</td>
      </tr>`).join('')
    : '<tr><td colspan="8">Belum ada riwayat ujian.</td></tr>';
}

function applyRiwayatFilter() {
  const search = document.getElementById('riwayat-search').value.toLowerCase();
  const kelas = document.getElementById('riwayat-filter-kelas').value;
  let data = cachedRiwayat;
  if (search) data = data.filter(r => r.namaSiswa.toLowerCase().includes(search));
  if (kelas) data = data.filter(r => r.kelas === kelas);
  renderRiwayatTable(data);
}
document.getElementById('riwayat-search').addEventListener('input', applyRiwayatFilter);
document.getElementById('riwayat-filter-kelas').addEventListener('change', applyRiwayatFilter);

document.getElementById('btn-export-riwayat').addEventListener('click', () => {
  if (!cachedRiwayat.length) return showToast('Tidak ada data untuk diekspor.', 'error');
  exportToExcel(cachedRiwayat.map(r => ({
    Nama: r.namaSiswa, Kelas: r.kelas, Ujian: r.namaUjian,
    Benar: r.jumlahBenar, Salah: r.jumlahSalah, Kosong: r.jumlahKosong, Nilai: r.nilai, Status: r.statusVerifikasi
  })), 'riwayat-ujian.xlsx', 'Riwayat Ujian');
});

document.getElementById('btn-print-riwayat').addEventListener('click', () => window.print());

// ============================================================
// LAPORAN & ANALISIS
// ============================================================
async function loadLaporan() {
  const kunciRes = cachedKunci.length ? { data: cachedKunci } : await apiGet('getKunciJawaban');
  cachedKunci = kunciRes.data;
  const select = document.getElementById('laporan-ujian');
  select.innerHTML = cachedKunci.map(k => `<option value="${k.id}">${k.namaUjian}</option>`).join('');
  if (cachedKunci.length) {
    await renderLaporan(cachedKunci[0].id);
    select.addEventListener('change', () => renderLaporan(select.value));
  }
}

async function renderLaporan(ujianId) {
  const res = await apiGet('getAnalisisSoal', { ujianId });
  if (!res.success) { showToast(res.message, 'error'); return; }
  const d = res.data;

  document.getElementById('laporan-stats').innerHTML = `
    <div class="stat-card"><div class="icon">📊</div><div class="value">${d.rataKelas}</div><div class="label">Rata-rata Kelas</div></div>
    <div class="stat-card"><div class="icon">⬆</div><div class="value">${d.tertinggi} / ${d.terendah}</div><div class="label">Tertinggi / Terendah</div></div>
    <div class="stat-card"><div class="icon">🎓</div><div class="value">${d.tuntas}/${d.jumlahSiswa}</div><div class="label">Siswa Tuntas</div></div>
    <div class="stat-card"><div class="icon">⚠️</div><div class="value">${d.soalSulit}</div><div class="label">Soal Kategori Sulit</div></div>
  `;

  document.querySelector('#laporan-table tbody').innerHTML = d.analisisSoal
    .sort((a, b) => a.persenBenar - b.persenBenar)
    .map(a => `
      <tr>
        <td>${a.nomor}</td><td><strong>${a.kunci}</strong></td>
        <td>${a.persenBenar}%</td><td>${a.persenSalah}%</td><td>${a.persenKosong}%</td>
        <td>A:${a.distribusi.A} B:${a.distribusi.B} C:${a.distribusi.C} D:${a.distribusi.D}</td>
        <td>${tingkatBadge(a.tingkatKesulitan)}</td>
      </tr>`).join('');

  const soalSulit = d.analisisSoal.filter(a => a.tingkatKesulitan === 'Sulit');
  document.getElementById('laporan-kesimpulan').innerHTML = `
    <h3>💡 Kesimpulan & Rekomendasi</h3>
    ${soalSulit.length
      ? '<ul>' + soalSulit.map(a => `<li>Soal No. ${a.nomor} tergolong <strong>sulit</strong> (hanya ${a.persenBenar}% benar) — pertimbangkan untuk ditinjau ulang atau diberi penguatan materi.</li>`).join('') + '</ul>'
      : '<p>Tidak ada soal yang tergolong sulit secara signifikan pada ujian ini.</p>'}
  `;
}

// ============================================================
// MANAJEMEN PENGGUNA (Super Admin)
// ============================================================
async function loadUsers() {
  const res = await apiGet('getUsers');
  if (!res.success) return showToast(res.message, 'error');
  document.querySelector('#users-table tbody').innerHTML = res.data.map(u => `
    <tr>
      <td>${u.nama}</td><td>${u.email}</td><td>${u.role}</td><td>${statusBadge(u.status)}</td>
      <td>${u.status === 'Pending' ? `<button class="btn btn-primary btn-sm" onclick="approveUserAction('${u.id}')">Setujui</button>` : ''}</td>
    </tr>`).join('');
}

async function approveUserAction(id) {
  const res = await apiPost('approveUser', { id });
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) loadUsers();
}

// ============================================================
// PENGATURAN BRANDING (Super Admin)
// ============================================================
async function loadBranding() {
  const res = await apiGet('getBranding');
  if (!res.success) return;
  const b = res.data;
  document.getElementById('brand-appName').value = b.appName || 'SmartCorrect';
  document.getElementById('brand-logoUrl').value = b.logoUrl || '';
  document.getElementById('brand-primaryColor').value = b.primaryColor || '#2563EB';
  document.getElementById('brand-accentColor').value = b.accentColor || '#F97316';
  updateBrandPreview();
}

function updateBrandPreview() {
  const appName = document.getElementById('brand-appName').value;
  const primary = document.getElementById('brand-primaryColor').value;
  const accent = document.getElementById('brand-accentColor').value;
  document.getElementById('brand-preview').innerHTML = `
    <div class="brand-preview-header" style="background:${primary}">${appName}</div>
    <div class="brand-preview-body"><button class="btn" style="background:${accent};color:#fff">Tombol Aksi</button></div>`;
}
['brand-appName', 'brand-primaryColor', 'brand-accentColor'].forEach(id =>
  document.getElementById(id).addEventListener('input', updateBrandPreview));

document.getElementById('btn-save-branding').addEventListener('click', async () => {
  const data = {
    appName: document.getElementById('brand-appName').value,
    logoUrl: document.getElementById('brand-logoUrl').value,
    primaryColor: document.getElementById('brand-primaryColor').value,
    accentColor: document.getElementById('brand-accentColor').value
  };
  const res = await apiPost('updateBranding', data);
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) loadBrandingIntoUI();
});

async function loadBrandingIntoUI() {
  const res = await apiGet('getBranding');
  if (!res.success || !res.data.appName) return;
  document.getElementById('app-name-sidebar').textContent = res.data.appName;
  document.title = res.data.appName;
  if (res.data.primaryColor) document.documentElement.style.setProperty('--primary', res.data.primaryColor);
  if (res.data.accentColor) document.documentElement.style.setProperty('--accent', res.data.accentColor);
}

// ============================================================
// HELPERS
// ============================================================
function statusBadge(status) {
  const map = {
    'Terverifikasi': 'badge-success', 'Aktif': 'badge-success',
    'Perlu Verifikasi': 'badge-warn', 'Pending': 'badge-warn',
    'Nonaktif': 'badge-error'
  };
  return `<span class="badge ${map[status] || 'badge-info'}">${status}</span>`;
}
function tingkatBadge(tingkat) {
  const map = { 'Mudah': 'badge-success', 'Sedang': 'badge-info', 'Sulit': 'badge-error' };
  return `<span class="badge ${map[tingkat]}">${tingkat}</span>`;
}
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function escapeQ(str) { return String(str).replace(/'/g, "\\'"); }
