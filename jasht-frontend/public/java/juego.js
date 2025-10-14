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

  // Cargar datos del juego
  async function cargarJuego() {
    if (!gameId) {
      tituloEl.textContent = "ID no proporcionado";
      return;
    }

    try {
      const API_URL = "http://localhost:3000";
      const res = await fetch(`${API_URL}/games/${gameId}`);
;

      if (!res.ok) throw new Error("Juego no encontrado en el servidor");

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

      // Mostrar reseñas (compatibilidad con strings antiguos y objetos {text,rating})
      if (Array.isArray(juego.reviews) && juego.reviews.length > 0) {
        reviewsList.innerHTML = juego.reviews.map(r => {
          if (typeof r === "string") {
            return `<li class="review-item">
                      <span class="review-stars">${'★'.repeat(5)}</span>
                      <span class="review-text">${escapeHtml(r)}</span>
                    </li>`;
          } else {
            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            return `<li class="review-item">
                      <span class="review-stars">${stars}</span>
                      <span class="review-text">${escapeHtml(r.text)}</span>
                    </li>`;
          }
        }).join("");
      } else {
        reviewsList.innerHTML = '<li class="no-reviews">No hay reseñas aún. Sé el primero en escribir una.</li>';
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
    if (!ratingInput) return alert("Selecciona una puntuación (estrellas).");
    if (!text) return alert("Escribe una reseña antes de enviar.");

    const payload = {
      text,
      rating: Number(ratingInput.value)
    };

    try {
        const API_URL = "http://localhost:3000";
        const res = await fetch(`${API_URL}/games/${gameId}/reviews`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(()=>({mensaje:'Error'}));
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
        }).join("");
      }

      // Actualizar puntuación mostrada
      ratingEl.textContent = updated.rating ? (Number(updated.rating).toFixed(1)) : ratingEl.textContent;

      // limpiar
      reviewText.value = "";
      const checked = document.querySelector('input[name="rating"]:checked');
      if (checked) checked.checked = false;

    } catch (err) {
      console.error("Error al enviar reseña:", err);
      alert("No se pudo enviar la reseña. Reintenta.");
    }
  });

  // utilidad para escapar HTML en reseñas
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m];
    });
  }

  // init
  cargarJuego();
});

