# 📋 Panduan Instalasi — SmartCorrect

## === BACKEND (Google Apps Script) ===
1. Buka https://script.google.com → **Proyek Baru**
2. Rename file `Code.gs` bawaan → `Kode` → paste seluruh isi `Kode.gs` yang diberikan terpisah di chat
3. Jalankan `setupAppEnvironment` — **HANYA SEKALI**:
   - Dropdown fungsi di toolbar atas → pilih `setupAppEnvironment` → klik ▶ **Run**
   - Klik **Review permissions** → izinkan akses Google Drive & Sheets
   - Buka **Execution Log** (Ctrl+Enter) → pastikan muncul "✅ Setup selesai!"
   - Cek Google Drive: folder **📁 SmartCorrect** sudah terbuat berisi spreadsheet database
   - ⚠️ **JANGAN** jalankan `setupAppEnvironment` lebih dari sekali (akan membuat folder & sheet duplikat)
4. **Deploy** → **New Deployment** → pilih tipe **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy** → salin **URL /exec**
5. Daftar sebagai pengguna **PERTAMA** lewat form Register di frontend — otomatis menjadi **Super Admin**. Pendaftaran guru berikutnya akan berstatus "Pending" dan perlu disetujui lewat menu Manajemen Pengguna.

## === FRONTEND (GitHub Pages) ===
Folder ini (`index.html`, `css/`, `js/`) adalah **root repository** Anda — jangan buat folder pembungkus lagi.

1. **Sebelum** push: buka `js/config.js`, ganti baris `GAS_URL` dengan URL `/exec` dari langkah Backend di atas.
2. Ikuti panduan deploy GitHub Pages langkah demi langkah (saya akan pandu lewat chat jika dibutuhkan): buat repository baru (Public) → masuk ke folder ini di terminal → `git init` → `git add .` → `git commit -m "Upload pertama"` → `git remote add origin <url-repo>` → `git push -u origin main` → aktifkan **Settings → Pages → Deploy from branch: main / root**.
3. Tunggu 1-2 menit, buka `https://USERNAME.github.io/NAMA-REPO/`

## === TEST ===
1. Buka URL frontend → halaman login muncul
2. Daftar sebagai pengguna pertama (otomatis Super Admin) → login
3. Tambah mata pelajaran → buat kunci jawaban → tambah siswa → coba Pindai & Koreksi
4. Buka Chrome DevTools (F12) → tab Network → pastikan tidak ada error CORS saat fetch ke GAS

## ⚠️ Catatan Penting — Deteksi Jawaban Otomatis
Versi ini menyediakan **input manual per nomor** pada halaman Pindai & Koreksi (guru memilih A/B/C/D untuk tiap nomor sambil melihat foto lembar jawaban). Ini memastikan akurasi 100% pada tahap awal.

Untuk deteksi bubble otomatis dari foto (OMR sesungguhnya), diperlukan integrasi **Google Cloud Vision API**:
- Aktifkan Cloud Vision API di Google Cloud Console
- Buat API Key, simpan di Script Properties backend (`CLOUD_VISION_KEY`)
- Tambahkan fungsi `detectBubbles(imageBase64)` di `Kode.gs` yang memanggil Vision API via `UrlFetchApp`
- Ini adalah pengembangan Tahap 2+ sesuai roadmap PRD — beri tahu saya jika ingin saya bantu implementasikan.

## Import Kunci Jawaban (Excel/Word/PDF)
Parsing dilakukan **di browser** (tidak membebani kuota GAS):
- **Excel (.xlsx/.xls/.csv):** kolom A = nomor soal, kolom B = jawaban
- **Word (.doc/.docx)** & **PDF**: sistem mencari pola teks seperti `1. A`, `2) B`, `3 - C` secara otomatis. Jika format dokumen tidak rapi, hasil parsing bisa meleset — gunakan input manual sebagai cadangan.
