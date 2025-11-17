/*
  Utilidades compartidas para todo el frontend
  - getApiBase: resuelve la base de la API según entorno
  - parseToken: decodifica el token JWT almacenado
  - requireAuthOrRedirect: valida sesión y redirige si falta
  - setHeader: configura el header con datos de usuario y acciones
  - escapeHtml: sanea textos antes de inyectarlos en HTML
*/
(() => {
  // Devuelve la base de la API (localhost en desarrollo con puerto 8080)
  function getApiBase(){
    return (window.location.port === '8080' ? 'http://localhost:3000' : '');
  }
  // Intenta decodificar el token JWT del localStorage
  function parseToken(){
    try{
      const t = localStorage.getItem('token');
      if (!t) return null;
      return JSON.parse(atob(t.split('.')[1]));
    }catch(_){ return null; }
  }
  // Si no hay token, alerta y redirige a la pantalla de login
  function requireAuthOrRedirect(){
    const t = localStorage.getItem('token');
    if (!t){ alert('Debes iniciar sesión para acceder a esta función.'); window.location.href = '/html/login.html'; return false; }
    return true;
  }
  // Dibuja datos del usuario en el header y habilita el botón de logout
  function setHeader(){
    const token = localStorage.getItem('token');
    const ui = document.getElementById('user-info');
    const lb = document.getElementById('logout-btn');
    const adminAdd = document.getElementById('admin-add');
    const addLink = document.getElementById('add-link');
    if (ui && token){
      const datos = parseToken();
      if (datos){
        ui.textContent = ' ' + (datos.email || datos.username || '');
        if (adminAdd) adminAdd.style.display = datos.role === 'admin' ? '' : 'none';
        if (addLink) addLink.style.display = datos.role === 'admin' ? 'none' : '';
        // Ocultar enlace "Inicio" para admin
        const homeLinks = document.querySelectorAll('nav.menu a[href$="index.html"], nav.menu a[href="/index.html"]');
        homeLinks.forEach(a => { a.style.display = datos.role === 'admin' ? 'none' : ''; });
        // Ocultar botón "Agregar juego" (biblioteca privada) si es admin
        const addBtn = document.getElementById('agregar');
        if (addBtn) addBtn.style.display = datos.role === 'admin' ? 'none' : '';
      }
    }
    if (lb){
      if (!token) lb.style.display = 'none';
      lb.addEventListener('click', function(){ localStorage.removeItem('token'); window.location.href = '/html/login.html'; });
    }
    if (!token){ if (adminAdd) adminAdd.style.display = 'none'; if (addLink) addLink.style.display = 'none'; }
  }
  // Escapa caracteres especiales para prevenir XSS
  function escapeHtml(str){
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }
  window.Common = { getApiBase, parseToken, requireAuthOrRedirect, setHeader, escapeHtml };
})();