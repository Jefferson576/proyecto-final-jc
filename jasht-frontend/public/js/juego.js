document.addEventListener("DOMContentLoaded", () => {
    // Obtener ID desde la URL
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    // Elementos del DOM
    const imagenEl = document.getElementById("imagen");
    const tituloEl = document.getElementById("titulo");
    const descripcionEl = document.getElementById("descripcion");
    const categoriaEl = document.getElementById("categoria");
    const anioEl = document.getElementById("anio");
    const developerEl = document.getElementById("developer");
    const sizeEl = document.getElementById("size");
    const versionEl = document.getElementById("version");
    const ratingEl = document.getElementById("rating");
    const horasEl = document.getElementById("horas");
    const reviewsList = document.getElementById("reviews-list");

    const reviewForm = document.getElementById("review-form");
    const reviewText = document.getElementById("review-text");

    const volverBtn = document.getElementById("volver");
    volverBtn.addEventListener("click", () => window.location.href = "/");

    // placeholder de imagen si no existe
    const placeholder = "https://via.placeholder.com/350x220?text=No+Image";

    const API_BASE = (window.location.port === '8080' ? 'http://localhost:3000' : '');
    // Cargar datos del juego
    async function cargarJuego() {
        if (!gameId) {
            tituloEl.textContent = "ID no proporcionado";
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/games/${gameId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    try {
                        const err = await res.json();
                        alert(err.mensaje || "Tu sesión ha expirado o falta el token. Inicia sesión nuevamente.");
                    } catch (_) {
                        alert("Tu sesión ha expirado o falta el token. Inicia sesión nuevamente.");
                    }
                    localStorage.removeItem("token");
                    window.location.href = "/html/login.html";
                    return;
                }
                const msg = await res.text();
                throw new Error(`Juego no encontrado (status ${res.status}). ${msg}`);
            }

            const juego = await res.json();
            // debug
            console.log("Juego cargado:", juego);

            imagenEl.src = juego.image || placeholder;
            imagenEl.alt = juego.title || "Imagen del juego";
            tituloEl.textContent = juego.title || "Sin título";
            descripcionEl.textContent = juego.description || "Sin descripción.";
            categoriaEl.textContent = juego.category || "Desconocida";
            anioEl.textContent = juego.year || (juego.createdAt ? new Date(juego.createdAt).getFullYear() : "Desconocido");
            developerEl.textContent = juego.developer || "Desconocido";
            sizeEl.textContent = juego.size || "Desconocido";
            versionEl.textContent = juego.version || "—";
            ratingEl.textContent = juego.rating ? juego.rating.toFixed(1) : "0.0";
            horasEl.textContent = juego.hoursPlayed ?? 0;

            // Mostrar reseñas propias y acumular rating
            let htmlPropias = '';
            let ownSum = 0, ownCount = 0;
            if (Array.isArray(juego.reviews) && juego.reviews.length > 0) {
                htmlPropias = juego.reviews.map(r => {
                    if (typeof r === "string") {
                        ownSum += 5; ownCount += 1;
                        return `<li class="review-item">
                      <span class="review-stars">${'★'.repeat(5)}</span>
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

    // Enviar reseña
    reviewForm.addEventListener("submit", async (e) => {
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
                        return `<li class="review-item"><span class="review-stars">${'★'.repeat(5)}</span><span class="review-text">${escapeHtml(r)}</span></li>`;
                    } else {
                        return `<li class="review-item"><span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span><span class="review-text">${escapeHtml(r.text)}</span></li>`;
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
