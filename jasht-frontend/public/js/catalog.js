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
        if (!token){ alert('Inicia sesión para guardar juegos.'); window.location.href='/html/login.html'; return; }
        const payload = {
          title: juego.title || 'Sin título',
          description: juego.description || '',
          category: juego.category || 'General',
          image: juego.image || '',
          hoursPlayed: Number(juego.hoursPlayed)||0,
          rating: Number(juego.rating)||0,
          completed: false
        };
        try{
          const res = await fetch(`${API_URL}/games`,{ method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(payload) });
          if (!res.ok){ try{ const err = await res.json(); alert(err.mensaje || 'No se pudo guardar.'); }catch(_){ alert('No se pudo guardar.'); } return; }
          saveBtn.textContent = 'Guardado';
          saveBtn.disabled = true;
          savedSet.add(key);
        }catch(err){ alert('Error de red al guardar.'); }
      });
      actions.appendChild(saveBtn);
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
});