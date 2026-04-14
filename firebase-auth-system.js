// ============================================================
// SISTEMA DE AUTENTICACIÓN FIREBASE + GUARDADO DE ANIMES
// Reemplaza el sistema localStorage básico del template
// 
// INSTRUCCIÓN: Busca en tu XML la línea que empieza con:
//   document.addEventListener('DOMContentLoaded',function(){const nama=localStorage.getItem('userName');
// y reemplaza todo ese bloque JS con este código.
//
// TAMBIÉN agrega antes del </head>:
//   <script src='https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js'/>
//   <script src='https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js'/>
//   <script src='https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'/>
// ============================================================

// ▼ REEMPLAZA CON TU CONFIG DE FIREBASE ▼
const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// URL de tu página de perfil en Blogger
const PROFILE_PAGE_URL = "/p/perfil.html";

// ============================================================
// INICIALIZACIÓN
// ============================================================
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();

// Estado global del usuario
window.currentUser = null;
window.savedPostIds = new Set();

// ============================================================
// AUTH STATE OBSERVER
// ============================================================
auth.onAuthStateChanged(async (user) => {
  window.currentUser = user;
  
  if (user) {
    // Usuario logueado
    const userInfo = {
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      avatar: user.photoURL || getDefaultAvatar(user.uid),
      uid: user.uid
    };
    
    updateUILoggedIn(userInfo);
    await loadSavedPostIds(user.uid);
    refreshBookmarkButtons();
    
    // Guardar/actualizar perfil en Firestore
    await db.collection('users').doc(user.uid).set({
      displayName: userInfo.name,
      email: user.email,
      photoURL: userInfo.avatar,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
  } else {
    // Usuario no logueado
    window.savedPostIds = new Set();
    updateUILoggedOut();
    refreshBookmarkButtons();
  }
});

// ============================================================
// UI HELPERS
// ============================================================
function updateUILoggedIn(userInfo) {
  const userEl = document.querySelector('.user');
  const userItem = document.querySelector('.user-item');
  const userLogin = document.querySelector('.user-login');
  const avatarImg = document.querySelector('.user-avatar img');
  
  if (userEl) userEl.textContent = userInfo.name;
  if (userItem) userItem.classList.remove('d-none');
  if (userLogin) userLogin.classList.add('d-none');
  if (avatarImg) avatarImg.src = userInfo.avatar;
}

function updateUILoggedOut() {
  const userEl = document.querySelector('.user');
  const userItem = document.querySelector('.user-item');
  const userLogin = document.querySelector('.user-login');
  const avatarImg = document.querySelector('.user-avatar img');
  
  if (userEl) userEl.textContent = 'Iniciar sesión';
  if (userItem) userItem.classList.add('d-none');
  if (userLogin) userLogin.classList.remove('d-none');
  if (avatarImg) avatarImg.src = 'https://lh3.googleusercontent.com/a/default-user';
}

function getDefaultAvatar(uid) {
  const colors = ['7b51d4','5c9df5','f25f5c','52d89f','f5a623','d4a2f7'];
  const color = colors[parseInt(uid.charAt(0), 16) % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent('U')}&background=${color}&color=fff&size=60`;
}

// ============================================================
// MODAL DE LOGIN (reemplaza el prompt básico)
// ============================================================
function showLoginModal(defaultTab = 'login') {
  // Crear modal si no existe
  if (!document.getElementById('ga-login-modal')) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div id="ga-login-modal" class="modal ga-modal is-login fade" tabindex="-1" role="dialog" style="display:none">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-cover" style="background-image:url('https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800')"></div>
            <div class="tab-content p-4" id="auth-tab-content">
              
              <!-- TABS -->
              <ul class="bc-tabs mb-3" id="auth-tabs" style="display:flex;gap:0;background:var(--bg2,#16181f);border-radius:11px;padding:3px;border:1px solid var(--border-color,rgba(255,255,255,0.07))">
                <li class="flex:1;flex:1">
                  <button id="tab-login-btn" onclick="switchAuthTab('login')" style="flex:1;width:100%;padding:8px;cursor:pointer;border:none;background:transparent;font-size:13px;color:var(--txt2,#6b6f82);border-radius:8px;font-weight:500;transition:all .15s" class="bc-tab active">Iniciar sesión</button>
                </li>
                <li style="flex:1">
                  <button id="tab-register-btn" onclick="switchAuthTab('register')" style="width:100%;padding:8px;cursor:pointer;border:none;background:transparent;font-size:13px;color:var(--txt2,#6b6f82);border-radius:8px;font-weight:500;transition:all .15s" class="bc-tab">Registrarse</button>
                </li>
              </ul>

              <!-- LOGIN FORM -->
              <div id="tab-login" class="auth-form">
                <div class="ga-form">
                  <div class="form-group">
                    <label class="prelabel">Correo electrónico</label>
                    <input type="email" id="login-email" class="form-control" placeholder="tu@email.com" autocomplete="email"/>
                  </div>
                  <div class="form-group">
                    <label class="prelabel">Contraseña</label>
                    <input type="password" id="login-password" class="form-control" placeholder="••••••••" autocomplete="current-password"/>
                  </div>
                  <div id="login-error" style="color:var(--red,#f25f5c);font-size:12px;margin-bottom:8px;display:none"></div>
                  <button class="btn btn-primary w-100" id="login-submit-btn" onclick="handleLogin()">
                    <span id="login-btn-text">Iniciar sesión</span>
                  </button>
                  <div class="bc-divider my-3">o continúa con</div>
                  <button class="btn btn-ghost w-100" onclick="handleGoogleLogin()" style="border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;gap:8px">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </button>
                  <div style="margin-top:12px;text-align:center;font-size:13px;color:var(--txt2,#6b6f82)">
                    <a href="#" onclick="showForgotPassword()" style="color:var(--acc2,#a594f9)">¿Olvidaste tu contraseña?</a>
                  </div>
                </div>
              </div>

              <!-- REGISTER FORM -->
              <div id="tab-register" class="auth-form" style="display:none">
                <div class="ga-form">
                  <div class="form-group">
                    <label class="prelabel">Nombre de usuario</label>
                    <input type="text" id="register-name" class="form-control" placeholder="TuNombre"/>
                  </div>
                  <div class="form-group">
                    <label class="prelabel">Correo electrónico</label>
                    <input type="email" id="register-email" class="form-control" placeholder="tu@email.com" autocomplete="email"/>
                  </div>
                  <div class="form-group">
                    <label class="prelabel">Contraseña</label>
                    <input type="password" id="register-password" class="form-control" placeholder="Mínimo 6 caracteres" autocomplete="new-password"/>
                  </div>
                  <div id="register-error" style="color:var(--red,#f25f5c);font-size:12px;margin-bottom:8px;display:none"></div>
                  <button class="btn btn-primary w-100" onclick="handleRegister()">
                    <span id="register-btn-text">Crear cuenta</span>
                  </button>
                </div>
              </div>

            </div>
            <button onclick="closeLoginModal()" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.5);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">×</button>
          </div>
        </div>
      </div>
      <div id="ga-modal-overlay" onclick="closeLoginModal()" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);backdrop-filter:blur(10px);z-index:1054"></div>
    `;
    document.body.appendChild(modal);
  }
  
  switchAuthTab(defaultTab);
  document.getElementById('ga-login-modal').style.display = 'flex';
  document.getElementById('ga-login-modal').style.position = 'fixed';
  document.getElementById('ga-login-modal').style.top = '0';
  document.getElementById('ga-login-modal').style.left = '0';
  document.getElementById('ga-login-modal').style.right = '0';
  document.getElementById('ga-login-modal').style.bottom = '0';
  document.getElementById('ga-login-modal').style.zIndex = '1055';
  document.getElementById('ga-login-modal').style.alignItems = 'center';
  document.getElementById('ga-login-modal').style.justifyContent = 'center';
  document.getElementById('ga-modal-overlay').style.display = 'block';
}

function closeLoginModal() {
  const modal = document.getElementById('ga-login-modal');
  const overlay = document.getElementById('ga-modal-overlay');
  if (modal) modal.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('tab-register').style.display = tab === 'register' ? 'block' : 'none';
  
  const loginBtn = document.getElementById('tab-login-btn');
  const regBtn = document.getElementById('tab-register-btn');
  if (loginBtn && regBtn) {
    loginBtn.style.background = tab === 'login' ? 'var(--bg4,#31343f)' : 'transparent';
    loginBtn.style.color = tab === 'login' ? 'var(--txt0,#f0f1f5)' : 'var(--txt2,#6b6f82)';
    regBtn.style.background = tab === 'register' ? 'var(--bg4,#31343f)' : 'transparent';
    regBtn.style.color = tab === 'register' ? 'var(--txt0,#f0f1f5)' : 'var(--txt2,#6b6f82)';
  }
}

// ============================================================
// AUTH HANDLERS
// ============================================================
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  
  if (!email || !password) {
    errEl.textContent = 'Completa todos los campos.';
    errEl.style.display = 'block';
    return;
  }
  
  btnText.textContent = 'Iniciando sesión...';
  errEl.style.display = 'none';
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeLoginModal();
    showNotification('¡Bienvenido de vuelta!', 'success');
  } catch (e) {
    errEl.textContent = getAuthError(e.code);
    errEl.style.display = 'block';
  } finally {
    btnText.textContent = 'Iniciar sesión';
  }
}

async function handleRegister() {
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const errEl = document.getElementById('register-error');
  const btnText = document.getElementById('register-btn-text');
  
  if (!name || !email || !password) {
    errEl.textContent = 'Completa todos los campos.';
    errEl.style.display = 'block';
    return;
  }
  
  btnText.textContent = 'Creando cuenta...';
  errEl.style.display = 'none';
  
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    
    // Crear perfil en Firestore
    await db.collection('users').doc(cred.user.uid).set({
      displayName: name,
      email: email,
      photoURL: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    closeLoginModal();
    showNotification(`¡Cuenta creada! Bienvenido, ${name}!`, 'success');
  } catch (e) {
    errEl.textContent = getAuthError(e.code);
    errEl.style.display = 'block';
  } finally {
    btnText.textContent = 'Crear cuenta';
  }
}

async function handleGoogleLogin() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    closeLoginModal();
    showNotification('¡Sesión iniciada con Google!', 'success');
  } catch (e) {
    console.error('Google login error:', e);
    showNotification('Error al iniciar con Google.', 'error');
  }
}

async function showForgotPassword() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) {
    document.getElementById('login-error').textContent = 'Ingresa tu correo arriba primero.';
    document.getElementById('login-error').style.display = 'block';
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    showNotification('Correo de restablecimiento enviado.', 'success');
  } catch (e) {
    showNotification('Error al enviar el correo.', 'error');
  }
}

function handleLogout() {
  auth.signOut().then(() => {
    showNotification('Sesión cerrada correctamente.', 'success');
    // Limpiar bookmarks visuales
    document.querySelectorAll('.btn-bookmark.active').forEach(b => b.classList.remove('active'));
  }).catch(console.error);
}

function getAuthError(code) {
  const errors = {
    'auth/user-not-found': 'No existe cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/email-already-in-use': 'Este correo ya está registrado.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'Correo electrónico inválido.',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
    'auth/network-request-failed': 'Error de conexión.',
  };
  return errors[code] || 'Error de autenticación. Intenta de nuevo.';
}

// ============================================================
// SISTEMA DE GUARDADO DE ANIMES/POSTS (BOOKMARKS)
// ============================================================
async function loadSavedPostIds(uid) {
  try {
    const snapshot = await db.collection('users').doc(uid)
      .collection('savedPosts').get();
    window.savedPostIds = new Set(snapshot.docs.map(d => d.id));
  } catch (e) {
    console.error('Error loading saved posts:', e);
    window.savedPostIds = new Set();
  }
}

async function savePost(postData) {
  if (!window.currentUser) {
    showLoginModal('login');
    return false;
  }
  
  const uid = window.currentUser.uid;
  const postId = postData.id || postData.url.replace(/[^a-z0-9]/gi, '-');
  
  try {
    const isAlreadySaved = window.savedPostIds.has(postId);
    
    if (isAlreadySaved) {
      // Quitar de guardados
      await db.collection('users').doc(uid)
        .collection('savedPosts').doc(postId).delete();
      window.savedPostIds.delete(postId);
      showNotification('Eliminado de tu lista.', 'info');
      return false; // fue eliminado
    } else {
      // Agregar a guardados
      await db.collection('users').doc(uid)
        .collection('savedPosts').doc(postId).set({
          postId: postId,
          title: postData.title || 'Sin título',
          url: postData.url || '',
          image: postData.image || '',
          savedAt: firebase.firestore.FieldValue.serverTimestamp(),
          isPublic: false
        });
      window.savedPostIds.add(postId);
      showNotification('¡Guardado en tu lista!', 'success');
      return true; // fue guardado
    }
  } catch (e) {
    console.error('Error saving post:', e);
    showNotification('Error al guardar. Intenta de nuevo.', 'error');
    return null;
  }
}

async function togglePostVisibility(postId, isPublic) {
  if (!window.currentUser) return;
  try {
    await db.collection('users').doc(window.currentUser.uid)
      .collection('savedPosts').doc(postId).update({ isPublic });
    showNotification(isPublic ? 'Publicado en tu perfil.' : 'Marcado como privado.', 'success');
  } catch (e) {
    showNotification('Error al actualizar visibilidad.', 'error');
  }
}

async function getUserSavedPosts(uid) {
  try {
    const snapshot = await db.collection('users').doc(uid)
      .collection('savedPosts')
      .orderBy('savedAt', 'desc')
      .get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error fetching saved posts:', e);
    return [];
  }
}

async function getPublicSavedPosts(uid) {
  try {
    const snapshot = await db.collection('users').doc(uid)
      .collection('savedPosts')
      .where('isPublic', '==', true)
      .orderBy('savedAt', 'desc')
      .get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return [];
  }
}

// ============================================================
// REFRESH BOOKMARK BUTTONS
// Sincroniza el estado visual de los botones de bookmark
// ============================================================
function refreshBookmarkButtons() {
  document.querySelectorAll('.btn-bookmark').forEach(btn => {
    const bm = btn.closest('[data-for], [for]');
    if (!bm) return;
    const forAttr = bm.getAttribute('for') || bm.getAttribute('data-for') || '';
    const postId = forAttr.replace('bm-', '').replace(/[^a-z0-9]/gi, '-');
    
    if (window.savedPostIds && window.savedPostIds.has(postId)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// ============================================================
// INTERCEPTAR CLICKS EN BOOKMARK BUTTONS
// Reemplaza el sistema ignielBookmark con Firebase
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // ── Login button click ──
  const userLogin = document.querySelector('.user-login');
  if (userLogin) {
    userLogin.addEventListener('click', () => showLoginModal('login'));
  }
  
  // ── Logout click ──
  const logoutBtn = document.querySelector('.logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // ── Perfil click ──
  const profileLinks = document.querySelectorAll('.user-profile-link, [data-profile]');
  profileLinks.forEach(el => {
    el.addEventListener('click', (e) => {
      if (!window.currentUser) {
        e.preventDefault();
        showLoginModal();
      } else {
        window.location.href = PROFILE_PAGE_URL;
      }
    });
  });
  
  // ── Interceptar clicks en bookmark-buttons ──
  document.addEventListener('click', async (e) => {
    const bookmarkBtn = e.target.closest('.btn-bookmark');
    if (!bookmarkBtn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.currentUser) {
      showLoginModal('login');
      return;
    }
    
    const wrapper = bookmarkBtn.closest('[data-title], [data-for], .bookmark-button');
    if (!wrapper) return;
    
    const postData = {
      title: wrapper.getAttribute('data-title') || document.title,
      url: wrapper.getAttribute('data-url') || window.location.href,
      image: wrapper.getAttribute('data-img') || '',
      id: (wrapper.getAttribute('data-for') || wrapper.getAttribute('for') || '').replace('bm-', '')
    };
    
    // Normalizar ID
    if (!postData.id) {
      postData.id = postData.url.replace(/https?:\/\/[^/]+\//, '').replace(/[^a-z0-9]/gi, '-').substring(0, 60);
    }
    
    const saved = await savePost(postData);
    
    if (saved === true) {
      bookmarkBtn.classList.add('active');
    } else if (saved === false) {
      bookmarkBtn.classList.remove('active');
    }
  });
  
  // ── Click en el botón Save del player ──
  const saveBtn = document.querySelector('#right-panel .btn-save, [data-action="save"]');
  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.currentUser) {
        showLoginModal('login');
        return;
      }
      const postData = {
        title: document.title,
        url: window.location.href,
        image: document.querySelector('meta[property="og:image"]')?.content || '',
        id: window.location.pathname.replace(/[^a-z0-9]/gi, '-').substring(1, 60)
      };
      await savePost(postData);
    });
  }
  
  // ── Vincular el elemento .watch-list del menú con perfil ──
  const watchListItem = document.querySelector('.watch-list');
  if (watchListItem) {
    watchListItem.addEventListener('click', () => {
      if (!window.currentUser) {
        showLoginModal('login');
      } else {
        window.location.href = PROFILE_PAGE_URL;
      }
    });
  }
  
  // ── Cambiar avatar ──
  const changeAvatarBtn = document.getElementById('changeavatar');
  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', async () => {
      if (!window.currentUser) return;
      const url = prompt('Ingresa la URL de tu nueva foto de perfil:');
      if (!url) return;
      try {
        await window.currentUser.updateProfile({ photoURL: url });
        await db.collection('users').doc(window.currentUser.uid).update({ photoURL: url });
        document.querySelector('.user-avatar img').src = url;
        showNotification('Avatar actualizado.', 'success');
      } catch (e) {
        showNotification('Error al actualizar avatar.', 'error');
      }
    });
  }
});

// ============================================================
// NOTIFICACIONES TOAST
// ============================================================
function showNotification(message, type = 'info') {
  const existing = document.getElementById('ga-toast');
  if (existing) existing.remove();
  
  const colors = {
    success: '#52d89f',
    error: '#f25f5c',
    info: '#7c6af7',
    warning: '#f5a623'
  };
  
  const toast = document.createElement('div');
  toast.id = 'ga-toast';
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:var(--bg3,#272934);color:#fff;
    padding:12px 20px;border-radius:10px;font-size:14px;
    border-left:3px solid ${colors[type] || colors.info};
    box-shadow:0 8px 24px rgba(0,0,0,.4);
    animation:slideInToast .3s ease;
    max-width:320px;
  `;
  toast.textContent = message;
  
  if (!document.getElementById('ga-toast-style')) {
    const style = document.createElement('style');
    style.id = 'ga-toast-style';
    style.textContent = `
      @keyframes slideInToast {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ============================================================
// EXPORTAR PARA USO EXTERNO (página de perfil)
// ============================================================
window.gaAuth = {
  getCurrentUser: () => window.currentUser,
  showLoginModal,
  closeLoginModal,
  handleLogout,
  getUserSavedPosts,
  getPublicSavedPosts,
  togglePostVisibility,
  db,
  auth
};
