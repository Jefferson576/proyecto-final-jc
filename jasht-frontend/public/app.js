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
  const gameForm = document.getElementById("game-form");
  const modal = document.getElementById("modal-editar");
  const closeBtn = document.querySelector(".close");
  const token = localStorage.getItem("token");
  const API_URL = (window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin);
  let juegosCache = [];

  // Si no hay token, redirige al login
  if (!token) {
    alert("Debes iniciar sesión para acceder a esta función.");
    window.location.href = "./html/login.html";
    return;
  }

  // BUSCADOR 
  function setupBuscar(callback) {
    if (!inputBuscar) return;
    inputBuscar.addEventListener("input", (e) => {
      const texto = e.target.value.toLowerCase();
      if (typeof callback === "function") callback(texto);
    });
  }

  // MOSTRAR JUEGOS 
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

      card.innerHTML = `
        <img src="${imagen}" alt="${escapeHtml(juego.title || 'Juego')}">
        <div class="info">
          <h2>${escapeHtml(juego.title || "Sin título")}</h2>
          <p>${escapeHtml((juego.description || "").slice(0, 150))}${
        juego.description && juego.description.length > 150 ? "..." : ""
      }</p>
          <p><strong>Categoría:</strong> ${escapeHtml(juego.category || "Desconocida")}</p>
          <p><strong>Horas jugadas:</strong> ${juego.hoursPlayed ?? 0}</p>
          <div class="rating-mini">&#9733 ${
            juego.rating ? Number(juego.rating).toFixed(1) : "0.0"
          }/5</div>
        </div>
        <div class="game-actions">
          <button class="edit-btn">Editar</button>
          <button class="delete-btn">Eliminar</button>
        </div>
      `;

      // Ver detalle 
      const img = card.querySelector("img");
      const titleEl = card.querySelector("h2");
      const abrirDetalle = () => (window.location.href = `html/juego.html?id=${juego._id}`);
      img?.addEventListener("click", abrirDetalle);
      titleEl?.addEventListener("click", abrirDetalle);

      // Eliminar 
      const delBtn = card.querySelector(".delete-btn");
      delBtn?.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`¿Seguro que quieres eliminar "${juego.title}"?`)) return;

        try {
          const res = await fetch(`${API_URL}/games/${juego._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            alert("Juego eliminado correctamente");
            cargarJuegos();
          } else {
            const err = await res.json();
            alert(err.mensaje || "Error al eliminar el juego");
          }
        } catch (err) {
          console.error("Error al eliminar:", err);
        }
      });

      // Editar 
      const editBtn = card.querySelector(".edit-btn");
      editBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirModalEdicion(juego);
      });

      contenedor.appendChild(card);
    });
  }

  // CARGAR JUEGOS 
  async function cargarJuegos() {
    try {
      const res = await fetch(`${API_URL}/games`, {
        headers: { Authorization: `Bearer ${token}` },
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
        throw new Error(`HTTP ${res.status}`);
      }
      const juegos = await res.json();
      juegosCache = Array.isArray(juegos) ? juegos : [];
      renderizarJuegos(juegosCache);

      // Activar búsqueda
      setupBuscar((texto) => {
        const filtrados = juegosCache.filter(
          (j) =>
            (j.title || "").toLowerCase().includes(texto) ||
            (j.category || "").toLowerCase().includes(texto)
        );
        renderizarJuegos(filtrados);
      });
    } catch (err) {
      console.error("Error cargando juegos:", err);
      contenedor.innerHTML = "<p>Error al cargar los juegos. Revisa la consola.</p>";
    }
  }

  // AGREGAR JUEGO 
  if (gameForm) {
    gameForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nuevoJuego = {
        title: document.getElementById("title")?.value || "",
        description: document.getElementById("description")?.value || "",
        category: document.getElementById("category")?.value || "",
        image: document.getElementById("image")?.value || "",
        hoursPlayed: Number(document.getElementById("hoursPlayed")?.value) || 0,
        rating: Number(document.getElementById("rating")?.value) || 0,
        completed: document.getElementById("completed")?.checked || false,
      };

      try {
        const res = await fetch(`${API_URL}/games`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(nuevoJuego),
        });
        if (!res.ok) {
          // Manejo específico de autenticación
          if (res.status === 401 || res.status === 403) {
            try {
              const err = await res.json();
              alert(err.mensaje || "Necesitas iniciar sesión para agregar juegos.");
            } catch (_) {
              alert("Necesitas iniciar sesión para agregar juegos.");
            }
            localStorage.removeItem("token");
            window.location.href = "/html/login.html";
            return;
          }
          // Otros errores
          try {
            const err = await res.json();
            alert(err.mensaje || "Error al agregar juego");
          } catch (_) {
            alert("Error al agregar juego");
          }
          return;
        }
        alert("Juego agregado correctamente");
        gameForm.reset();
        cargarJuegos();
      } catch (err) {
        console.error("Error al agregar juego:", err);
        alert("No se pudo agregar el juego. Revisa tu conexión o intenta nuevamente.");
      }
    });
  }

  // MODAL EDICIÓN 
  function abrirModalEdicion(juego) {
    const inputTitulo = document.getElementById("edit-titulo");
    const inputDescripcion = document.getElementById("edit-descripcion");
    const inputCategoria = document.getElementById("edit-categoria");
    const inputHoras = document.getElementById("edit-horas");
    const btnGuardar = document.getElementById("guardar-edicion");
    const btnCancelar = document.getElementById("cancelar-edicion");
    const inputCompletado = document.getElementById("edit-completed");

    modal.style.display = "flex";
    inputTitulo.value = juego.title || "";
    inputDescripcion.value = juego.description || "";
    inputCategoria.value = juego.category || "";
    inputHoras.value = juego.hoursPlayed || 0;

    btnGuardar.onclick = async () => {
      const nuevosDatos = {
        title: inputTitulo.value,
        description: inputDescripcion.value,
        category: inputCategoria.value,
        hoursPlayed: Number(inputHoras.value) || 0,
        rating: Number(document.getElementById("edit-rating")?.value) || 0,
      };

      try {
        const res = await fetch(`${API_URL}/games/${juego._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(nuevosDatos),
        });

        if (!res.ok) throw new Error("Error al actualizar");
        alert("Juego actualizado correctamente");
        modal.style.display = "none";
        cargarJuegos();
      } catch (err) {
        console.error("Error al actualizar juego:", err);
      }
    };

    btnCancelar.onclick = () => (modal.style.display = "none");
  }

  // CERRAR MODAL 
  closeBtn?.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // salir HTML 
  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str.replace(/[&<>"']/g, (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
    );
  }

  // CARGAR USUARIO EN HEADER 
  const userInfo = document.getElementById("user-info");
  if (userInfo && token) {
    try {
      const datos = JSON.parse(atob(token.split(".")[1]));
      userInfo.textContent = ` ${datos.email}`;
    } catch {
      userInfo.innerHTML = `<a href="./html/login.html">Iniciar sesión</a>`;
    }
  }
  // CERRAR SESIÓN 
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      window.location.href = "/html/login.html";
    });
  }

  // Iniciar carga inicial
  cargarJuegos();
});
