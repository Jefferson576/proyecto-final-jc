document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-editar');
  const authStatus = document.getElementById('auth-status');
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');
  const token = localStorage.getItem('token');
  const API_BASE = (window.location.port === '8080' ? 'http://localhost:3000' : '');

  if (!token){
    if (authStatus) authStatus.textContent = 'No autenticado. Inicia sesión para editar juegos.';
    alert('Debes iniciar sesión como admin para editar juegos.');
    window.location.href = '/html/login.html';
    return;
  }
  let esAdmin = false;
  try{ const datos = JSON.parse(atob(token.split('.')[1])); esAdmin = datos.role === 'admin'; }catch(_){ esAdmin = false; }
  if (!esAdmin){
    if (authStatus) authStatus.textContent = 'Se requiere cuenta admin para editar.';
  }
  if (authStatus && token){
    try{ const datos = JSON.parse(atob(token.split('.')[1])); authStatus.textContent = `Sesión: ${datos.email || datos.username || 'usuario'} • Editando`; }catch(_){}
  }

  async function cargar(){
    if (!editId){ alert('Falta el ID del juego.'); return; }
    try{
      const res = await fetch(`${API_BASE}/games/${editId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok){ const msg = await res.text(); alert(`No se pudo cargar el juego: ${msg}`); return; }
      const j = await res.json();
      const ps = document.getElementById('public-status');
      if (ps){ ps.textContent = j.public ? 'Estado: Público (visible para todos)' : 'Estado: Privado (sólo tu cuenta)'; }
      document.getElementById('title').value = j.title || '';
      document.getElementById('description').value = j.description || '';
      document.getElementById('category').value = j.category || '';
      document.getElementById('image').value = j.image || '';
      document.getElementById('developer').value = j.developer || '';
      document.getElementById('year').value = j.year || '';
      document.getElementById('rating').value = j.rating || 0;
      const sz = document.getElementById('size'); if (sz) sz.value = j.size || '';
      const vs = document.getElementById('version'); if (vs) vs.value = j.version || '';
    }catch(err){ alert('Error de red al cargar'); }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      category: document.getElementById('category').value.trim(),
      image: document.getElementById('image').value.trim(),
      developer: document.getElementById('developer').value.trim(),
      year: Number(document.getElementById('year').value) || undefined,
      
      rating: Number(document.getElementById('rating').value) || 0,
      size: (document.getElementById('size')?.value || '').trim(),
      version: (document.getElementById('version')?.value || '').trim()
    };
    if (!payload.title || !payload.description || !payload.category){ alert('Completa los campos obligatorios.'); return; }
    try{
      const res = await fetch(`${API_BASE}/games/${editId}`,{
        method:'PUT',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok){ const msg = await res.text(); alert(`No se pudo editar: ${msg}`); return; }
      try{ localStorage.setItem('catalog_refresh', JSON.stringify({ id: editId, at: Date.now() })); }catch(_){}
      alert('Juego actualizado correctamente');
    }catch(err){ alert('Error de red al editar'); }
  });

  cargar();
});