// ============================================================
// AUTH — Login, Register, Logout
// ============================================================
let currentUser = null;

document.getElementById('show-register').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  showLoadingBtn(btn, 'Masuk...');

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const result = await apiPost('login', { email, password });

  hideLoadingBtn(btn);
  if (result.success) {
    setToken(result.token);
    localStorage.setItem('sc_user', JSON.stringify(result.user));
    currentUser = result.user;
    showToast('Selamat datang, ' + result.user.nama + '!');
    initApp();
  } else {
    showToast(result.message, 'error');
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  showLoadingBtn(btn, 'Mendaftar...');

  const nama = document.getElementById('reg-nama').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const result = await apiPost('register', { nama, email, password });

  hideLoadingBtn(btn);
  showToast(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('login-email').value = email;
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await apiPost('logout', {});
  clearToken();
  currentUser = null;
  location.reload();
});

function checkSession() {
  const token = getToken();
  const user = localStorage.getItem('sc_user');
  if (token && user) {
    currentUser = JSON.parse(user);
    return true;
  }
  return false;
}
