document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-juego");
    const authStatus = document.getElementById("auth-status");

    const token = localStorage.getItem("token");
    if (!token) {
        if (authStatus) authStatus.textContent = "No autenticado. Inicia sesión para agregar juegos.";
        alert("Debes iniciar sesión para agregar juegos.");
        window.location.href = "/html/login.html";
        return;
    }

    // Mostrar usuario autenticado
    if (authStatus) {
        try {
            const datos = JSON.parse(atob(token.split(".")[1]));
            authStatus.textContent = `Sesión activa: ${datos.email || datos.username || "usuario"}`;
        } catch {
            authStatus.textContent = "Sesión activa";
        }
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const category = document.getElementById("category").value.trim();
        const image = document.getElementById("image").value.trim();
        const developer = document.getElementById("developer").value.trim();
        const hoursPlayedRaw = Number(document.getElementById("hoursPlayed").value);
        const ratingRaw = Number(document.getElementById("rating").value);

        const nuevoJuego = {
            title,
            description,
            category,
            image,
            developer,
            hoursPlayed: Number.isFinite(hoursPlayedRaw) ? hoursPlayedRaw : 0,
            rating: Number.isFinite(ratingRaw) ? ratingRaw : 0,
            completed: false
        };

        if (!nuevoJuego.title || !nuevoJuego.description || !nuevoJuego.category) {
            alert("Por favor completa todos los campos obligatorios.");
            return;
        }

        try {
            const API_BASE = (window.location.port === '8080' ? 'http://localhost:3000' : '');
            const res = await fetch(`${API_BASE}/games`, {
                method: "POST",
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

            alert("Juego agregado correctamente");
            form.reset();
            // Redirigir al index.html después de agregar el juego
            window.location.href = "/index.html";
        } catch (err) {
            console.error("Error al enviar el formulario:", err);
            alert("Hubo un error al guardar el juego.");
        }
    });
});