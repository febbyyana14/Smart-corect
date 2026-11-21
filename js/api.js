// ============================================================
// API HELPERS — komunikasi ke Google Apps Script (REST JSON)
// ============================================================

function getToken() {
  return localStorage.getItem('sc_token') || '';
}

function setToken(token) {
  localStorage.setItem('sc_token', token);
}

function clearToken() {
  localStorage.removeItem('sc_token');
  localStorage.removeItem('sc_user');
}

// GET — untuk membaca data
async function apiGet(action, params = {}) {
  try {
    const query = new URLSearchParams({ action, token: getToken(), ...params }).toString();
    const res = await fetch(`${GAS_URL}?${query}`);
    const data = await res.json();
    if (!data.success && data.message && data.message.includes('Token')) {
      handleSessionExpired();
    }
    return data;
  } catch (err) {
    showToast('Gagal memuat data: ' + err.message, 'error');
    return { success: false, message: err.message };
  }
}

// POST — untuk menulis data
// ⚠️ WAJIB text/plain — JSON memicu CORS preflight yang diblok GAS
async function apiPost(action, data = {}) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: getToken(), data })
    });
    const result = await res.json();
    if (!result.success && result.message && result.message.includes('Token')) {
      handleSessionExpired();
    }
    return result;
  } catch (err) {
    showToast('Gagal mengirim data: ' + err.message, 'error');
    return { success: false, message: err.message };
  }
}

function handleSessionExpired() {
  clearToken();
  showToast('Sesi berakhir. Silakan login kembali.', 'error');
  setTimeout(() => location.reload(), 1200);
}

// ============================================================
// UI HELPERS
// ============================================================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showLoadingBtn(btn, text = 'Memproses...') {
  btn.dataset.originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = text;
}

function hideLoadingBtn(btn) {
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || btn.textContent;
}
