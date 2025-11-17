// Showcase/carousel para pantallas de login y listado compacto en auth pages
document.addEventListener('DOMContentLoaded', () => {
  // Contenedor de showcase; si no existe, no hacemos nada
  const cont = document.getElementById('games-showcase') || document.querySelector('.games-showcase');
  if (!cont) return;

  const API_URL = (window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin);
  const token = localStorage.getItem('token');
  let savedSet = new Set();
  // Modo carrusel sólo en login
  const isCarousel = document.body.classList.contains('login-page');

  function escapeHtml(str){
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }

  // Render en tarjetas simples
  function render(list){
    cont.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0){
      cont.innerHTML = '<p>No hay juegos disponibles.</p>';
      return;
    }
    list.forEach(juego => {
      const card = document.createElement('div');
      card.className = 'game-card';
      const imagen = juego.image || 'https://via.placeholder.com/300x160?text=Juego';
      card.innerHTML = `
        <img src="${imagen}" alt="${escapeHtml(juego.title || 'Juego')}">
        <div class="info">
          <h2>${escapeHtml(juego.title || 'Sin título')}</h2>
          <p>${escapeHtml((juego.description || '').slice(0, 160))}${(juego.description||'').length>160?'...':''}</p>
          <div class="rating-mini">&#9733 ${(juego.rating?Number(juego.rating).toFixed(1):'0.0')}/5</div>
        </div>
      `;
      const imgEl = card.querySelector('img');
      if (imgEl){
        imgEl.loading = 'lazy';
        imgEl.onerror = () => {
          const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#182c22"/><stop offset="1" stop-color="#0b1a12"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" fill="#87ffad" font-size="16" font-family="Segoe UI, Arial" text-anchor="middle" dominant-baseline="middle">Sin imagen</text></svg>');
          imgEl.src = `data:image/svg+xml;utf8,${svg}`;
        };
      }
      const actions = document.createElement('div');
      actions.className = 'game-actions';
      const saveBtn = document.createElement('button');
      saveBtn.className = 'save-btn';
      const key = (juego.title || '').toLowerCase();
      const yaGuardado = savedSet.has(key);
      saveBtn.textContent = yaGuardado ? 'Guardado' : 'Guardar';
      saveBtn.disabled = yaGuardado;
      saveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!token){
          alert('Inicia sesión para guardar juegos en tu biblioteca.');
          window.location.href = '/html/login.html';
          return;
        }
        const payload = {
          title: juego.title || 'Sin título',
          description: juego.description || '',
          category: juego.category || 'General',
          image: juego.image || '',
          developer: juego.developer || '',
          hoursPlayed: Number(juego.hoursPlayed)||0,
          rating: Number(juego.rating)||0,
          sourceKey: `${(juego.title||'').toLowerCase()}::${(juego.developer||'').toLowerCase()}`,
          completed: false
        };
        try{
          const res = await fetch(`${API_URL}/games`,{
            method:'POST',
            headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
            body: JSON.stringify(payload)
          });
          if (!res.ok){
            try{ const err = await res.json(); alert(err.mensaje || 'No se pudo guardar.'); }
            catch(_){ alert('No se pudo guardar.'); }
            return;
          }
          saveBtn.textContent = 'Guardado';
          saveBtn.disabled = true;
          savedSet.add(key);
        }catch(err){
          console.error('Error al guardar:', err);
          alert('Error de red al guardar.');
        }
      });
      actions.appendChild(saveBtn);
      card.appendChild(actions);
      cont.appendChild(card);
    });
  }

  // Render en modo carrusel rotando elementos
  function renderCarousel(list){
    cont.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0){ cont.innerHTML = '<p>No hay juegos disponibles.</p>'; return; }
    const card = document.createElement('div');
    card.className = 'carousel-card fade-in';
    cont.appendChild(card);
    let i = 0;
    function show(idx){
      const juego = list[idx];
      const imagen = juego.image || 'https://via.placeholder.com/300x160?text=Juego';
      card.classList.remove('fade-in');
      card.classList.add('fade-out');
      setTimeout(() => {
        card.innerHTML = `
          <img src="${imagen}" alt="${escapeHtml(juego.title || 'Juego')}">
          <div class="overlay"><h2>${escapeHtml(juego.title || 'Sin título')}</h2></div>
        `;
        const imgEl2 = card.querySelector('img');
        if (imgEl2){
          imgEl2.loading = 'lazy';
          imgEl2.onerror = () => {
            const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#182c22"/><stop offset="1" stop-color="#0b1a12"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" fill="#87ffad" font-size="16" font-family="Segoe UI, Arial" text-anchor="middle" dominant-baseline="middle">Sin imagen</text></svg>');
            imgEl2.src = `data:image/svg+xml;utf8,${svg}`;
          };
        }
        card.classList.remove('fade-out');
        card.classList.add('fade-in');
      }, 300);
    }
    show(i);
    setInterval(() => { i = (i + 1) % list.length; show(i); }, 4500);
  }

  // Carga catálogo y (si hay token y no es login) la biblioteca para marcar guardados
  async function load(){
    try{
      if (token && !isCarousel){
        const resLib = await fetch(`${API_URL}/games`, { headers: { Authorization: `Bearer ${token}` } });
        if (resLib.ok){
          const misJuegos = await resLib.json();
          savedSet = new Set(misJuegos.map(j => (j.title || '').toLowerCase()));
        }
      }
      const res = await fetch(`${API_URL}/catalog`);
      if (!res.ok){
        cont.innerHTML = '<p>No se pudo cargar el catálogo.</p>';
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data)?data:[];
      if (isCarousel) renderCarousel(list); else render(list);
    }catch(err){
      cont.innerHTML = '<p>Error al cargar los juegos desde la base de datos.</p>';
    }
  }

  load();
});