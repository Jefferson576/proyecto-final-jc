// app.js robusto — reemplaza todo el archivo por este bloque
document.addEventListener('DOMContentLoaded', () => {
  // Buscar contenedor posible (soporta ambos nombres)
  const contenedor =
    document.getElementById('game-container') ||
    document.getElementById('games-container') ||
    document.querySelector('.games-container');

  if (!contenedor) {
    console.error('No se encontró el contenedor de juegos. Asegúrate de tener un elemento con id="game-container" o id="games-container" o class="games-container".');
    return;
  }

  const inputBuscar = document.getElementById('buscar'); // puede ser null (no obligatorio)
  const modal = document.getElementById('edit-modal');
  const closeBtn = document.querySelector('.close');
  const editForm = document.getElementById('edit-form');
  let juegoActual = null;

  // Añade listener de búsqueda solo si existe
  function setupBuscar(callback) {
    if (!inputBuscar) return;
    // remover listeners previos (por si se recarga este script)
    inputBuscar.replaceWith(inputBuscar.cloneNode(true));
    const nuevoBuscar = document.getElementById('buscar');
    nuevoBuscar.addEventListener('input', (e) => {
      const texto = e.target.value.toLowerCase();
      // el callback debe re-renderizar usando la lista disponible
      if (typeof callback === 'function') callback(texto);
    });
  }

  // Renderizar lista de juegos (recibe array y el contenedor DOM)
  function renderizarJuegos(lista) {
    contenedor.innerHTML = '';

    if (!Array.isArray(lista) || lista.length === 0) {
      contenedor.innerHTML = '<p>No hay juegos disponibles.</p>';
      return;
    }

    lista.forEach(juego => {
      const card = document.createElement('div');
      card.className = 'game-card';

      const imagen = juego.image || 'https://via.placeholder.com/300x160?text=Juego';

      card.innerHTML = `
        <img src="${imagen}" alt="${escapeHtml(juego.title || 'Juego')}">
        <div class="info">
          <h2>${escapeHtml(juego.title || 'Sin título')}</h2>
          <p>${escapeHtml((juego.description || '').slice(0, 120))}${juego.description && juego.description.length > 120 ? '...' : ''}</p>
          <p><strong>Categoría:</strong> ${escapeHtml(juego.category || 'Desconocida')}</p>
          <p><strong>Horas jugadas:</strong> ${juego.hoursPlayed ?? 0}</p>
          <div class="rating-mini">⭐ ${juego.rating ? Number(juego.rating).toFixed(1) : '0.0'}/5</div>
        </div>
        <div class="game-actions">
          <button class="edit-btn">Editar</button>
          <button class="delete-btn">Eliminar</button>
        </div>
      `;

      // Abrir detalle solo con click en la imagen o título
      const img = card.querySelector('img');
      const titleEl = card.querySelector('h2');
      const abrirDetalle = () => window.location.href = `html/juego.html?id=${juego._id}`;
      if (img) img.addEventListener('click', abrirDetalle);
      if (titleEl) titleEl.addEventListener('click', abrirDetalle);

      // Botón eliminar
      const delBtn = card.querySelector('.delete-btn');
      if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm(`¿Seguro quieres eliminar "${juego.title}"?`)) return;
          try {
            const res = await fetch(`/games/${juego._id}`, { method: 'DELETE' });
            if (res.ok) {
              alert('Juego eliminado correctamente');
              cargarJuegos(); // recargar lista
            } else {
              const err = await res.json().catch(() => ({ mensaje: 'Error al eliminar' }));
              alert('Error: ' + (err.mensaje || 'No se pudo eliminar'));
            }
          } catch (err) {
            console.error('Error al eliminar:', err);
            alert('Error al eliminar el juego (ver consola)');
          }
        });
      }

      // Botón editar
      const editBtn = card.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof abrirModalEdicion === 'function') abrirModalEdicion(juego);
        });
      }

      contenedor.appendChild(card);
    });
  }

  // Mantener la lista en memoria para búsquedas
  let juegosCache = [];

  // Cargar juegos desde backend
  async function cargarJuegos() {
    try {
      const res = await fetch('/games');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const juegos = await res.json();
      juegosCache = Array.isArray(juegos) ? juegos : [];
      renderizarJuegos(juegosCache);

      // setup buscar: filtra la lista en memoria
      setupBuscar(texto => {
        const filtrados = juegosCache.filter(j => (j.title || '').toLowerCase().includes(texto));
        renderizarJuegos(filtrados);
      });

    } catch (err) {
      console.error('Error cargando juegos:', err);
      contenedor.innerHTML = '<p>Error al cargar los juegos. Revisa la consola.</p>';
    }
  }

  // =========================
  // Agregar nuevo juego (si existe form)
  // =========================
  const gameForm = document.getElementById('game-form');
  if (gameForm) {
    gameForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nuevoJuego = {
        title: document.getElementById('title')?.value || '',
        description: document.getElementById('description')?.value || '',
        category: document.getElementById('category')?.value || '',
        image: document.getElementById('image')?.value || '',
        hoursPlayed: Number(document.getElementById('hoursPlayed')?.value) || 0,
        rating: Number(document.getElementById('rating')?.value) || 0,
        completed: false
      };
      try {
        const res = await fetch('/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nuevoJuego)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ mensaje: 'Error' }));
          alert('Error al agregar juego: ' + (err.mensaje || 'ver consola'));
        } else {
          alert('Juego agregado correctamente');
          gameForm.reset();
          cargarJuegos();
        }
      } catch (err) {
        console.error('Error al agregar juego:', err);
        alert('Error al agregar juego (ver consola)');
      }
    });
  }

  // =========================
  // Modal de edición (si existe)
  // =========================
  function abrirModalEdicion(juego) {
    if (!modal) {
      alert('El modal de edición no está presente en el HTML.');
      return;
    }
    juegoActual = juego;
    modal.style.display = 'block';

    // Rellenar campos del modal si existen
    document.getElementById('edit-title') && (document.getElementById('edit-title').value = juego.title || '');
    document.getElementById('edit-description') && (document.getElementById('edit-description').value = juego.description || '');
    document.getElementById('edit-category') && (document.getElementById('edit-category').value = juego.category || '');
    document.getElementById('edit-image') && (document.getElementById('edit-image').value = juego.image || '');
    document.getElementById('edit-hoursPlayed') && (document.getElementById('edit-hoursPlayed').value = juego.hoursPlayed || 0);
    document.getElementById('edit-rating') && (document.getElementById('edit-rating').value = juego.rating || 0);
  }

  if (closeBtn) closeBtn.addEventListener('click', () => modal && (modal.style.display = 'none'));
  window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!juegoActual) return alert('No hay juego seleccionado para editar.');
      const datosActualizados = {
        title: document.getElementById('edit-title')?.value || '',
        description: document.getElementById('edit-description')?.value || '',
        category: document.getElementById('edit-category')?.value || '',
        image: document.getElementById('edit-image')?.value || '',
        hoursPlayed: Number(document.getElementById('edit-hoursPlayed')?.value) || 0,
        rating: Number(document.getElementById('edit-rating')?.value) || 0
      };
      try {
        const res = await fetch(`/games/${juegoActual._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosActualizados)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ mensaje: 'Error' }));
          alert('Error al actualizar juego: ' + (err.mensaje || 'ver consola'));
        } else {
          alert('Juego actualizado');
          modal.style.display = 'none';
          cargarJuegos();
        }
      } catch (err) {
        console.error('Error al actualizar:', err);
        alert('Error al actualizar juego (ver consola)');
      }
    });
  }

  // =========================
  // Utilidades
  // =========================
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  // Inicializar
  cargarJuegos();
});
