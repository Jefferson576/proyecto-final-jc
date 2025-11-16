document.addEventListener('DOMContentLoaded', () => {
  const cont = document.getElementById('catalog-container');
  const buscar = document.getElementById('buscar-catalogo');
  if (!cont) return;

  const API_URL = (window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin);
  const token = localStorage.getItem('token');
  let savedSet = new Set();

  function escapeHtml(str){
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }

  function render(list){
    cont.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0){ cont.innerHTML = '<p>No hay juegos disponibles.</p>'; return; }
    list.forEach(juego => {
      const card = document.createElement('div');
      card.className = 'game-card';
      const imagen = juego.image || 'https://via.placeholder.com/300x160?text=Juego';
      card.innerHTML = `
        <img src="${imagen}" alt="${escapeHtml(juego.title || 'Juego')}">
        <div class="info">
          <h2>${escapeHtml(juego.title || 'Sin título')}</h2>
          <p>${escapeHtml((juego.description || '').slice(0, 220))}${(juego.description||'').length>220?'...':''}</p>
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
      let esAdmin = false;
      try{
        const tk = localStorage.getItem('token');
        if (tk){ const datos = JSON.parse(atob(tk.split('.')[1])); esAdmin = datos.role === 'admin'; }
      }catch(_){}
      if (esAdmin) saveBtn.style.display = 'none';
      saveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!token){ alert('Inicia sesión para guardar juegos.'); window.location.href='/html/login.html'; return; }
        const payload = {
          title: juego.title || 'Sin título',
          description: juego.description || '',
          category: juego.category || 'General',
          image: juego.image || '',
          developer: juego.developer || '',
          year: Number(juego.year)||undefined,
          size: juego.size || '',
          version: juego.version || '',
          hoursPlayed: Number(juego.hoursPlayed)||0,
          rating: Number(juego.rating)||0,
          progress: 0,
          sourceKey: `${(juego.title||'').toLowerCase()}::${(juego.developer||'').toLowerCase()}`,
          completed: false
        };
        try{
          const res = await fetch(`${API_URL}/games`,{ method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(payload) });
          if (!res.ok){ try{ const err = await res.json(); alert(err.mensaje || 'No se pudo guardar.'); }catch(_){ alert('No se pudo guardar.'); } return; }
          saveBtn.textContent = 'Guardado';
          saveBtn.disabled = true;
          savedSet.add(key);
          try{ localStorage.setItem('saved_refresh', JSON.stringify({ key, at: Date.now() })); }catch(_){}
        }catch(err){ alert('Error de red al guardar.'); }
      });
      actions.appendChild(saveBtn);
      // botón editar para admin
      
      if (esAdmin && juego._id){
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.location.href = `/html/editar.html?id=${encodeURIComponent(juego._id)}`;
        });
        actions.appendChild(editBtn);
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.textContent = 'Eliminar';
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('¿Eliminar este juego del catálogo? Se quitarán copias privadas.')) return;
          const tk2 = localStorage.getItem('token');
          try{
            const r = await fetch(`${API_URL}/games/${juego._id}`,{ method:'DELETE', headers:{ Authorization:`Bearer ${tk2}` } });
            if (!r.ok){ const msg = await r.text(); alert(`No se pudo eliminar: ${msg}`); return; }
            try{ localStorage.setItem('catalog_refresh', JSON.stringify({ id: juego._id, at: Date.now() })); }catch(_){}
            alert('Juego eliminado');
            load();
          }catch(err){ alert('Error de red al eliminar'); }
        });
        actions.appendChild(delBtn);
      }
      card.appendChild(actions);
      cont.appendChild(card);
    });
  }

  async function load(search){
    try{
      if (token){
        const resLib = await fetch(`${API_URL}/games`, { headers: { Authorization: `Bearer ${token}` } });
        if (resLib.ok){ const misJuegos = await resLib.json(); savedSet = new Set(misJuegos.map(j => (j.title || '').toLowerCase())); }
      }
      const url = search ? `${API_URL}/catalog?search=${encodeURIComponent(search)}` : `${API_URL}/catalog`;
      const res = await fetch(url);
      if (!res.ok){ cont.innerHTML = '<p>No se pudo cargar el catálogo.</p>'; return; }
      const data = await res.json();
      render(Array.isArray(data)?data:[]);
    }catch(err){ cont.innerHTML = '<p>Error al cargar juegos del catálogo.</p>'; }
  }

  buscar?.addEventListener('input', (e) => load(e.target.value.trim().toLowerCase()));
  load();
  // refrescar automáticamente cuando otra pestaña edite/cree en catálogo
  window.addEventListener('storage', (e) => {
    if (e.key === 'catalog_refresh') {
      load();
    }
    if (e.key === 'saved_refresh') {
      load();
    }
  });
});