document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgotForm");
  const mensaje = document.getElementById("mensaje");
  const resetLink = document.getElementById("reset-link");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    mensaje.textContent = "";
    resetLink.innerHTML = "";

    const email = document.getElementById("email").value.trim();
    if (!email) {
      mensaje.textContent = "Por favor ingresa tu correo.";
      return;
    }
    try {
      const API_BASE = (window.location.port === '8080' ? 'http://localhost:3000' : '');
      const REQUEST_URL = `${API_BASE}/forgot-password`;
      console.log("[forgot] POST", REQUEST_URL);
      const respuesta = await fetch(REQUEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let data;
      const ct = respuesta.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await respuesta.json();
      } else {
        const texto = await respuesta.text();
        throw new Error(`Respuesta no-JSON (${respuesta.status}). Content-Type: ${ct || "(vacío)"}. URL: ${respuesta.url}. Cuerpo: ${texto.slice(0, 200)}`);
      }

      if (!respuesta.ok) {
        mensaje.textContent = data.mensaje || `Error al generar enlace (status ${respuesta.status}).`;
        return;
      }

      mensaje.textContent = data.mensaje || "Enlace generado";
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.textContent = "Abrir página de restablecimiento";
        a.style.display = "inline-block";
        a.style.marginTop = "8px";
        resetLink.appendChild(a);
      }
    } catch (err) {
      console.error(err);
      mensaje.textContent = `Error de red: ${err.message}. Intenta de nuevo.`;
    }
  });
});