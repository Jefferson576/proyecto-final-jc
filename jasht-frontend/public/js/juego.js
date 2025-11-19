// Página de detalle del juego: muestra información, progreso y reseñas
document.addEventListener("DOMContentLoaded", () => {
    // Obtener ID desde la URL
    // Obtiene el ID de juego desde la URL
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");
    const sourceKey = params.get("key");
    const titleQuery = params.get("title") || "";
    const isPublic = params.get("public") === "1";

    // Elementos del DOM
    // Referencias a elementos del DOM
    const imagenEl = document.getElementById("imagen");
    const tituloEl = document.getElementById("titulo");
    const descripcionEl = document.getElementById("descripcion");
    const categoriaEl = document.getElementById("categoria");
    const anioEl = document.getElementById("anio");
    const developerEl = document.getElementById("developer");
    const sizeEl = document.getElementById("size");
    const versionEl = document.getElementById("version");
    const ratingEl = document.getElementById("rating");
    const reviewsList = document.getElementById("reviews-list");
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");
    const progressControl = document.getElementById("progress-control");
    const progressEdit = document.getElementById("progress-edit");
    const progressSave = document.getElementById("progress-save");
    const adminEditBtn = document.getElementById("admin-edit-btn");
    const adminDeleteBtn = document.getElementById("admin-delete-btn");

    const reviewForm = document.getElementById("review-form");
    const reviewText = document.getElementById("review-text");
    const descToggle = document.getElementById("desc-toggle");

    const volverBtn = document.getElementById("volver");
    volverBtn.addEventListener("click", () => window.location.href = isPublic ? "/html/catalog.html" : "/");

    // placeholder de imagen si no existe
    // Imagen por defecto si falta portada
    const placeholder = "https://via.placeholder.com/350x220?text=No+Image";

    const API_BASE = (window.location.port === '8080' ? 'http://localhost:3000' : '');
    // Cargar datos del juego
    // Carga los datos del juego desde la API
    async function cargarJuego() {
        if (!gameId) {
            tituloEl.textContent = "ID no proporcionado";
            return;
        }

        try {
            const token = localStorage.getItem("token");
            // Fuente: público del catálogo o juego privado del usuario
            const headers = isPublic ? {} : (token ? { Authorization: `Bearer ${token}` } : {});
            let res;
            if (isPublic) {
                // Preferir búsqueda por título para obtener el _id correcto del catálogo
                const searchTitle = (titleQuery || String(sourceKey || '').split('::')[0] || '').trim();
                if (searchTitle) {
                    try {
                        const sRes = await fetch(`${API_BASE}/catalog?search=${encodeURIComponent(searchTitle)}`);
                        if (sRes.ok) {
                            const list = await sRes.json();
                            if (Array.isArray(list) && list.length) {
                                const lower = searchTitle.toLowerCase();
                                const pick = list.find(x => String(x.title||'').toLowerCase() === lower) || list[0];
                                if (pick && pick._id) {
                                    res = await fetch(`${API_BASE}/catalog/${pick._id}`);
                                }
                            }
                        }
                    } catch(_e) {}
                }
                // Si búsqueda no resolvió, intentar por id/sourceKey directamente
                if (!res) {
                    const catalogTarget = sourceKey || gameId || '';
                    res = await fetch(`${API_BASE}/catalog/${catalogTarget}`);
                }
            } else {
                res = await fetch(`${API_BASE}/games/${gameId}`, { headers });
            }
            // Fallback 1: si vista pública falla y tenemos id, intenta por id en catálogo
            if (isPublic && !res.ok && gameId) {
                try { res = await fetch(`${API_BASE}/catalog/${gameId}`); } catch(_e) {}
            }
            // Fallback 2: si aún falla y hay token, intenta vía privada
            if (isPublic && !res.ok && token && gameId) {
                try { res = await fetch(`${API_BASE}/games/${gameId}`, { headers: { Authorization: `Bearer ${token}` } }); } catch(_e) {}
            }
            // Fallback 3: buscar por título en catálogo si aún no se pudo cargar
            if (isPublic && !res.ok) {
                try {
                    const searchTitle = (titleQuery || String(sourceKey || '').split('::')[0] || '').trim();
                    if (searchTitle) {
                        const sRes = await fetch(`${API_BASE}/catalog?search=${encodeURIComponent(searchTitle)}`);
                        if (sRes.ok) {
                            const list = await sRes.json();
                            if (Array.isArray(list) && list.length) {
                                const lower = searchTitle.toLowerCase();
                                const pick = list.find(x => String(x.title||'').toLowerCase() === lower) || list[0];
                                if (pick && pick._id) {
                                    res = await fetch(`${API_BASE}/catalog/${pick._id}`);
                                }
                            }
                        }
                    }
                } catch(_e) {}
            }
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    try {
                        const err = await res.json();
                        alert(err.mensaje || "Tu sesión ha expirado o falta el token. Inicia sesión nuevamente.");
                    } catch (_) {
                        alert("Tu sesión ha expirado o falta el token. Inicia sesión nuevamente.");
                    }
                    if (!isPublic) {
                      localStorage.removeItem("token");
                      window.location.href = "/html/login.html";
                      return;
                    }
                }
                const msg = await res.text();
                throw new Error(`Juego no encontrado (status ${res.status}). ${msg}`);
            }

            const juego = await res.json();

            // Render de datos principales
            imagenEl.src = juego.image || placeholder;
            imagenEl.alt = juego.title || "Imagen del juego";
            tituloEl.textContent = juego.title || "Sin título";
            descripcionEl.textContent = juego.description || "Sin descripción.";
            if (descToggle && descripcionEl) {
                function updateToggle(){
                    const expanded = descripcionEl.classList.contains('expanded');
                    if (expanded) { descToggle.style.display = ''; descToggle.textContent = 'Ver menos'; return; }
                    const overflow = descripcionEl.scrollHeight > (descripcionEl.clientHeight + 2);
                    descToggle.style.display = overflow ? '' : 'none';
                    descToggle.textContent = 'Ver más';
                }
                requestAnimationFrame(updateToggle);
                descToggle.onclick = function(){
                    const expanded = descripcionEl.classList.toggle('expanded');
                    descToggle.textContent = expanded ? 'Ver menos' : 'Ver más';
                    if (!expanded) requestAnimationFrame(updateToggle);
                };
            }
            categoriaEl.textContent = juego.category || "Desconocida";
            anioEl.textContent = juego.year || (juego.createdAt ? new Date(juego.createdAt).getFullYear() : "Desconocido");
            developerEl.textContent = juego.developer || "Desconocido";
            sizeEl.textContent = juego.size || "Desconocido";
            versionEl.textContent = juego.version || "—";
            ratingEl.textContent = juego.rating ? juego.rating.toFixed(1) : "0.0";

            const pv = Number(juego.progress);
            // Render del progreso visual
            if (progressFill && progressText) {
                const val = Number.isFinite(pv) ? Math.max(0, Math.min(100, pv)) : (juego.completed ? 100 : 0);
                progressFill.style.width = `${val}%`;
                progressText.textContent = `${val}%`;
            }

            let esAdmin = false;
            try {
                const token2 = localStorage.getItem("token");
                if (token2) {
                    const datos = JSON.parse(atob(token2.split('.') [1]));
                    esAdmin = datos.role === 'admin';
                }
            } catch(_){ esAdmin = false; }
            if (progressControl && progressEdit && progressSave) {
                const inicial = Number.isFinite(pv) ? Math.max(0, Math.min(100, pv)) : (juego.completed ? 100 : 0);
                progressEdit.value = inicial;
                // Ocultar control de progreso si es admin o si es vista pública del catálogo
                progressControl.style.display = (esAdmin || isPublic) ? 'none' : '';
                progressEdit.addEventListener('input', function(){
                    const v = Math.max(0, Math.min(100, Number(this.value)));
                    progressFill.style.width = `${v}%`;
                    progressText.textContent = `${v}%`;
                });
                progressSave.addEventListener('click', async function(){
                    const v = Math.max(0, Math.min(100, Number(progressEdit.value)));
                    try {
                        const token3 = localStorage.getItem("token");
                        const resU = await fetch(`${API_BASE}/games/${gameId}`,{
                            method:'PUT',
                            headers:{ 'Content-Type':'application/json', ...(token3?{ Authorization:`Bearer ${token3}` }: {}) },
                            body: JSON.stringify({ progress: v })
                        });
                        if (!resU.ok) throw new Error('Error al actualizar progreso');
                        const ju = await resU.json();
                        const np = Number(ju.progress);
                        const vv = Number.isFinite(np) ? np : v;
                        progressFill.style.width = `${vv}%`;
                        progressText.textContent = `${vv}%`;
                        alert('Progreso actualizado');
                    } catch(err){
                        console.error('Actualizar progreso:', err);
                        alert('No se pudo actualizar el progreso');
                    }
                });
            }

            // Botón editar (sólo admin)
            if (adminEditBtn && esAdmin){
                adminEditBtn.style.display = '';
                adminEditBtn.addEventListener('click', () => {
                    window.location.href = `/html/editar.html?id=${encodeURIComponent(gameId)}`;
                });
            }
            // Botón eliminar del catálogo (sólo admin)
            if (adminDeleteBtn && esAdmin){
                adminDeleteBtn.style.display = '';
                adminDeleteBtn.addEventListener('click', async () => {
                    if (!confirm('¿Eliminar este juego del catálogo? Se quitarán copias privadas.')) return;
                    const tk2 = localStorage.getItem('token');
                    try{
                        const r = await fetch(`${API_BASE}/games/${gameId}`,{ method:'DELETE', headers:{ Authorization:`Bearer ${tk2}` } });
                        if (!r.ok){ const msg = await r.text(); alert(`No se pudo eliminar: ${msg}`); return; }
                        try{ localStorage.setItem('catalog_refresh', JSON.stringify({ id: gameId, at: Date.now() })); }catch(_){}
                        alert('Juego eliminado');
                        window.location.href = '/html/catalog.html';
                    }catch(err){ alert('Error de red al eliminar'); }
                });
            }

            // Render de reseñas propias y cálculo de promedio (solo juegos privados)
            let htmlPropias = '';
            let ownSum = 0, ownCount = 0;
            if (!isPublic && Array.isArray(juego.reviews) && juego.reviews.length > 0) {
                htmlPropias = juego.reviews.map(r => {
                    if (typeof r === "string") {
                        ownSum += 5; ownCount += 1;
                        return `<li class="review-item">
                      <span class="review-stars">${'&#9733;'.repeat(5)}</span>
                      <span class="review-text">${escapeHtml(r)}</span>
                    </li>`;
                    } else {
                        const rr = Number(r.rating)||0; ownSum += rr; ownCount += 1;
                        const stars = "&#9733;".repeat(r.rating) + "&#9734;".repeat(5 - r.rating);
                        return `<li class="review-item">
                      <span class="review-stars">${stars}</span>
                      <span class="review-text">${escapeHtml(r.text)}</span>
                    </li>`;
                    }
                }
                ).join("");
            }

            // Reseñas compartidas por clave (title+developer)
            const keyBase = `${(juego.title || '').trim().toLowerCase()}|${(juego.developer || '').trim().toLowerCase()}`;
            let htmlCompartidas = '';
            let sharedSum = 0, sharedCount = 0;
            try {
                const resShared = await fetch(`${API_BASE}/shared-reviews?key=${encodeURIComponent(keyBase)}`);
                if (resShared.ok) {
                    const shared = await resShared.json();
                    if (Array.isArray(shared) && shared.length) {
                        htmlCompartidas = shared.map(r => {
                            const rr = Number(r.rating)||0;
                            sharedSum += rr; sharedCount += 1;
                            const stars = "&#9733;".repeat(rr) + "&#9734;".repeat(5 - rr);
                            return `<li class="review-item"><span class="review-stars">${stars}</span><span class="review-text">${escapeHtml(r.text||'')}</span></li>`;
                        }).join('');
                    }
                }
            } catch (_e) {}

            const finalHtml = [htmlPropias, htmlCompartidas].filter(Boolean).join('');
            reviewsList.innerHTML = finalHtml || '<li class="no-reviews">No hay reseñas aún. Sé el primero en escribir una.</li>';

            // Actualizar puntuación con promedio global (propias + compartidas)
            const totalCount = ownCount + sharedCount;
            if (totalCount > 0) {
                const avgGlobal = (ownSum + sharedSum) / totalCount;
                ratingEl.textContent = Number(avgGlobal).toFixed(1);
            }

        } catch (err) {
            console.error("Error cargando el juego:", err);
            tituloEl.textContent = "Error al cargar juego";
            descripcionEl.textContent = "No se pudo obtener la información del servidor.";
            reviewsList.innerHTML = '<li class="no-reviews">No hay reseñas disponibles.</li>';
        }
    }

    // Enviar reseña (solo en juegos privados del usuario)
    if (reviewForm && !isPublic) reviewForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const ratingInput = document.querySelector('input[name="rating"]:checked');
        const text = reviewText.value.trim();
        if (!ratingInput)
            return alert("Selecciona una puntuación (estrellas).");
        if (!text)
            return alert("Escribe una reseña antes de enviar.");

        const payload = {
            text,
            rating: Number(ratingInput.value)
        };

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/games/${gameId}/reviews`, {

                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch( () => ({
                    mensaje: 'Error'
                }));
                throw new Error(err.mensaje || "Error al enviar reseña");
            }

            const updated = await res.json();
            // Actualiza la lista con las reviews devueltas por el servidor
            if (Array.isArray(updated.reviews)) {
                reviewsList.innerHTML = updated.reviews.map(r => {
                    if (typeof r === "string") {
                        return `<li class="review-item"><span class="review-stars">${'&#9733;'.repeat(5)}</span><span class="review-text">${escapeHtml(r)}</span></li>`;
                    } else {
                        return `<li class="review-item"><span class="review-stars">${'&#9733;'.repeat(r.rating)}${'&#9734;'.repeat(5 - r.rating)}</span><span class="review-text">${escapeHtml(r.text)}</span></li>`;
                    }
                }
                ).join("");
            }

            // Actualizar puntuación mostrada
            // Recalcular con reseñas compartidas
            try {
                const keyBase2 = `${(updated.title || '').trim().toLowerCase()}|${(updated.developer || '').trim().toLowerCase()}`;
                const resShared2 = await fetch(`${API_BASE}/shared-reviews?key=${encodeURIComponent(keyBase2)}`);
                let sharedSum2 = 0, sharedCount2 = 0;
                if (resShared2.ok) {
                    const shared2 = await resShared2.json();
                    if (Array.isArray(shared2)) {
                        shared2.forEach(r => { sharedSum2 += Number(r.rating)||0; sharedCount2 += 1; });
                    }
                }
                const ownRatings = Array.isArray(updated.reviews) ? updated.reviews.map(r => (typeof r === 'string' ? 5 : Number(r.rating)||0)) : [];
                const ownSum2 = ownRatings.reduce((a,b)=>a+b,0);
                const ownCount2 = ownRatings.length;
                const total2 = ownCount2 + sharedCount2;
                const avg2 = total2 ? (ownSum2 + sharedSum2)/total2 : (updated.rating || 0);
                ratingEl.textContent = Number(avg2).toFixed(1);
            } catch(_e) {}

            // limpiar
            reviewText.value = "";
            const checked = document.querySelector('input[name="rating"]:checked');
            if (checked)
                checked.checked = false;

        } catch (err) {
            console.error("Error al enviar reseña:", err);
            alert("No se pudo enviar la reseña. Reintenta.");
        }
    }
    );

    // utilidad para escapar HTML en reseñas
    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function(m) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[m];
        });
    }

    // init
    cargarJuego();
}
);
