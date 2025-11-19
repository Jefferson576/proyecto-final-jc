// Inicializa la página principal: lista y gestión de juegos del usuario
document.addEventListener("DOMContentLoaded", () => {
  const contenedor =
    document.getElementById("game-container") ||
    document.getElementById("games-container") ||
    document.querySelector(".games-container");

  if (!contenedor) {
    console.error("No se encontró el contenedor principal de juegos.");
    return;
  }

  const inputBuscar = document.getElementById("buscar");
  const token = localStorage.getItem("token");
  const API_URL = Common.getApiBase() || window.location.origin;
  let juegosCache = [];
  let esAdmin = false;
  try { const datos = JSON.parse(atob((token||'').split('.') [1])); esAdmin = datos.role === 'admin'; } catch(_){ esAdmin = false; }

  if (!Common.requireAuthOrRedirect()) return;

  function setupBuscar(callback) {
    if (!inputBuscar) return;
    inputBuscar.addEventListener("input", (e) => {
      const texto = e.target.value.toLowerCase();
      if (typeof callback === "function") callback(texto);
    });
  }

  function renderizarJuegos(lista) {
    contenedor.innerHTML = "";
    if (!Array.isArray(lista) || lista.length === 0) {
      contenedor.innerHTML = "<p>No hay juegos disponibles.</p>";
      return;
    }
    lista.forEach((juego) => {
      const card = document.createElement("div");
      card.className = "game-card";
      const imagen = juego.image || "https://via.placeholder.com/300x160?text=Juego";
      let pv;
      { const p = Number(juego.progress); pv = Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : (juego.completed ? 100 : 0); }
      const progHtml = `
        <div class="progress-mini">
          <div class="bar"><div class="fill" style="width:${pv}%"></div></div>
          <span class="text">${pv}%</span>
        </div>
      `;
      const actionsHtml = `
        <div class="game-actions">
          ${esAdmin ? '<button class="edit-btn">Editar</button>' : ''}
          <button class="delete-btn">Eliminar</button>
        </div>
      `;
      const escapeHtml = Common.escapeHtml;
      card.innerHTML = `
        <img src="${imagen}" alt="${escapeHtml(juego.title || 'Juego')}">
        <div class="info">
          <h2>${escapeHtml(juego.title || "Sin título")}</h2>
          <p>${escapeHtml((juego.description || "").slice(0, 150))}${juego.description && juego.description.length > 150 ? "..." : ""}</p>
          <p><strong>Categoría:</strong> ${escapeHtml(juego.category || "Desconocida")}</p>
          <div class="rating-mini">&#9733 ${juego.rating ? Number(juego.rating).toFixed(1) : "0.0"}/5</div>
          ${progHtml}
        </div>
        ${actionsHtml}
      `;
      const img = card.querySelector("img");
      const titleEl = card.querySelector("h2");
      const abrirDetalle = () => (window.location.href = `/html/juego.html?id=${encodeURIComponent(juego._id)}`);
      img?.addEventListener("click", abrirDetalle);
      titleEl?.addEventListener("click", abrirDetalle);
      const delBtn = card.querySelector(".delete-btn");
      delBtn?.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`¿Seguro que quieres eliminar "${juego.title}"?`)) return;
        try {
          const res = await fetch(`${API_URL}/games/${juego._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) { alert("Juego eliminado correctamente"); cargarJuegos(); }
          else { const err = await res.json(); alert(err.mensaje || "Error al eliminar el juego"); }
        } catch (err) { console.error("Error al eliminar:", err); }
      });
      const editBtn = card.querySelector(".edit-btn");
      editBtn?.addEventListener("click", (e) => { e.stopPropagation(); window.location.href = `/html/editar.html?id=${encodeURIComponent(juego._id)}`; });
      contenedor.appendChild(card);
    });
  }

  async function cargarJuegos() {
    try {
      const res = await fetch(`${API_URL}/games`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          try { const err = await res.json(); alert(err.mensaje || "Tu sesión ha expirado o falta el token. Inicia sesión nuevamente."); }
          catch (_) { alert("Tu sesión ha expirado o falta el token. Inicia sesión nuevamente."); }
          localStorage.removeItem("token");
          window.location.href = "/html/login.html";
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const juegos = await res.json();
      juegosCache = Array.isArray(juegos) ? juegos : [];
      renderizarJuegos(juegosCache);
      setupBuscar((texto) => {
        const filtrados = juegosCache.filter((j) => (j.title || "").toLowerCase().includes(texto) || (j.category || "").toLowerCase().includes(texto));
        renderizarJuegos(filtrados);
      });
    } catch (err) { console.error("Error cargando juegos:", err); contenedor.innerHTML = "<p>Error al cargar los juegos. Revisa la consola.</p>"; }
  }

  Common.setHeader();
  const userInfo = document.getElementById("user-info");
  if (userInfo && token) {
    try {
      const datos = JSON.parse(atob(token.split(".")[1]));
      userInfo.textContent = ` ${datos.email}`;
      const adminAdd = document.getElementById('admin-add'); if (adminAdd) adminAdd.style.display = datos.role === 'admin' ? '' : 'none';
      const addBtn = document.getElementById('agregar'); if (addBtn) addBtn.style.display = datos.role === 'admin' ? '' : 'none';
      const addLink = document.getElementById('add-link'); if (addLink) addLink.style.display = datos.role === 'admin' ? '' : 'none';
    } catch { userInfo.innerHTML = `<a href="./html/login.html">Iniciar sesión</a>`; }
  }
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) { logoutBtn.addEventListener("click", () => { localStorage.removeItem("token"); window.location.href = "/html/login.html"; }); }
  if (!token) { const adminAdd = document.getElementById('admin-add'); if (adminAdd) adminAdd.style.display = 'none'; const addBtn = document.getElementById('agregar'); if (addBtn) addBtn.style.display = 'none'; const addLink = document.getElementById('add-link'); if (addLink) addLink.style.display = 'none'; }
  cargarJuegos();
});