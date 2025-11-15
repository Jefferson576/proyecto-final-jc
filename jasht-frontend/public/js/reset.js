function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");
  const mensaje = document.getElementById("mensaje");

  const token = getQueryParam("token");
  if (!token) {
    mensaje.textContent = "Token faltante. Solicita un nuevo enlace desde Recuperar contraseña.";
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    mensaje.textContent = "";

    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;

    if (password.length < 6) {
      mensaje.textContent = "La contraseña debe tener al menos 6 caracteres.";
      return;
    }
    if (password !== confirm) {
      mensaje.textContent = "Las contraseñas no coinciden.";
      return;
    }

    try {
      const base = (window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin);
      const respuesta = await fetch(`${base}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      let data;
      const ct = respuesta.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await respuesta.json();
      } else {
        const texto = await respuesta.text();
        throw new Error(`Respuesta no-JSON (${respuesta.status}). Cuerpo: ${texto.slice(0, 200)}`);
      }

      if (!respuesta.ok) {
        mensaje.textContent = data.mensaje || `Error al restablecer la contraseña (status ${respuesta.status}).`;
        return;
      }

      mensaje.textContent = data.mensaje || "Contraseña actualizada.";
      setTimeout(() => {
        window.location.href = "/html/login.html";
      }, 1200);
    } catch (err) {
      console.error(err);
      mensaje.textContent = `Error de red: ${err.message}. Intenta de nuevo.`;
    }
  });
});