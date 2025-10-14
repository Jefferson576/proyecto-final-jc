document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-juego");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nuevoJuego = {
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      category: document.getElementById("category").value.trim(),
      image: document.getElementById("image").value.trim(),
      hoursPlayed: Number(document.getElementById("hoursPlayed").value),
      rating: Number(document.getElementById("rating").value),
      completed: false
    };

    if (!nuevoJuego.title || !nuevoJuego.description || !nuevoJuego.category) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }

    try {
      const API_URL = "http://localhost:3000";
      const res = await fetch(`${API_URL}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoJuego)
      });

      if (!res.ok) {
        alert("❌ Error al agregar el juego");
        return;
      }

      alert("✅ Juego agregado correctamente");
      form.reset();
      // Redirigir al index
      window.location.href = "../index.html";
    } catch (err) {
      console.error("Error al enviar el formulario:", err);
      alert("Hubo un error al guardar el juego.");
    }
  });
});
