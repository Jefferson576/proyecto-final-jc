// Página para agregar juego (usuario) o editar juego público (admin)
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-juego");
    const authStatus = document.getElementById("auth-status");
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('editId');
    const API_BASE = (window.location.port === '8080' ? 'http://localhost:3000' : '');

    // Validación de sesión
    const token = localStorage.getItem("token");
    if (!token) {
        if (authStatus) authStatus.textContent = "No autenticado. Inicia sesión para agregar juegos.";
        alert("Debes iniciar sesión para agregar juegos.");
        window.location.href = "/html/login.html";
        return;
    }

    // Mostrar usuario autenticado
    if (authStatus) {
        // Muestra el usuario autenticado y ajusta controles según rol
        try {
            const datos = JSON.parse(atob(token.split(".")[1]));
            authStatus.textContent = `Sesión activa: ${datos.email || datos.username || "usuario"}`;
            const prog = document.getElementById('progress');
            const progLabel = document.getElementById('progress-label');
            if (prog && progLabel) {
                const esAdmin = datos.role === 'admin';
                prog.style.display = esAdmin ? 'none' : '';
                progLabel.style.display = esAdmin ? 'none' : '';
            }
            // Si está en modo edición, avisar en el estado
            if (editId) {
                authStatus.textContent += ' • Editando juego público';
                const btn = document.getElementById('agregar');
                if (btn) btn.textContent = 'Guardar cambios';
                // Precargar valores del juego
                // Precarga datos del juego a editar
                (async () => {
                    try{
                        const res = await fetch(`${API_BASE}/games/${editId}`,{ headers: { Authorization:`Bearer ${token}` } });
                        if (res.ok){
                            const j = await res.json();
                            document.getElementById("title").value = j.title || '';
                            document.getElementById("description").value = j.description || '';
                            document.getElementById("category").value = j.category || '';
                            document.getElementById("image").value = j.image || '';
                            document.getElementById("developer").value = j.developer || '';
                            document.getElementById("year").value = j.year || '';
                            document.getElementById("rating").value = j.rating || 0;
                        }
                    }catch(_){ /* noop */ }
                })();
            }
        } catch {
            authStatus.textContent = "Sesión activa";
        }
    }

    // Envía el formulario para crear/editar juego
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const category = document.getElementById("category").value.trim();
        const image = document.getElementById("image").value.trim();
        const developer = document.getElementById("developer").value.trim();
        const yearRaw = Number(document.getElementById("year").value);
        
        const ratingRaw = Number(document.getElementById("rating").value);
        const progressRaw = Number(document.getElementById("progress").value);
        let esAdmin = false;
        try { const datos = JSON.parse(atob(token.split('.') [1])); esAdmin = datos.role === 'admin'; } catch(_){ esAdmin = false; }

        const nuevoJuego = {
            title,
            description,
            category,
            image,
            developer,
            
            year: Number.isFinite(yearRaw) && yearRaw > 0 ? yearRaw : undefined,
            rating: Number.isFinite(ratingRaw) ? ratingRaw : 0,
            progress: esAdmin ? undefined : (Number.isFinite(progressRaw) ? Math.max(0, Math.min(100, progressRaw)) : 0)
        };

        if (!nuevoJuego.title || !nuevoJuego.description || !nuevoJuego.category) {
            alert("Por favor completa todos los campos obligatorios.");
            return;
        }

        try {
            const isEdit = Boolean(editId);
            const url = isEdit ? `${API_BASE}/games/${editId}` : `${API_BASE}/games`;
            const method = isEdit ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(nuevoJuego)
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    let msg = "Necesitas iniciar sesión para agregar juegos.";
                    try {
                        const err = await res.json();
                        msg = err.mensaje || msg;
                    } catch (_) {}
                    alert(msg);
                    localStorage.removeItem("token");
                    window.location.href = "/html/login.html";
                    return;
                }
                const msg = await res.text();
                alert(`Error al agregar el juego: ${msg}`);
                return;
            }

            if (editId){
                try{ localStorage.setItem('catalog_refresh', JSON.stringify({ id: editId, at: Date.now() })); }catch(_){}
                alert("Juego actualizado correctamente");
                return;
            } else {
                alert("Juego agregado correctamente");
                form.reset();
                try{ localStorage.setItem('catalog_refresh', JSON.stringify({ id: 'new', at: Date.now() })); }catch(_){}
                window.location.href = "/index.html";
            }
        } catch (err) {
            console.error("Error al enviar el formulario:", err);
            alert("Hubo un error al guardar el juego.");
        }
    });
});