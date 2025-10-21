document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-juego");

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
            const res = await fetch(`/games`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(nuevoJuego)
            });

            if (!res.ok) {
                const msg = await res.text();
                alert(`Error al agregar el juego: ${msg}`);
                return;
            }

            alert("Juego agregado correctamente");
            form.reset();
            // Redirigir al index
            window.location.href = "/index.html";
        } catch (err) {
            console.error("Error al enviar el formulario:", err);
            alert("Hubo un error al guardar el juego.");
        }
    });
});