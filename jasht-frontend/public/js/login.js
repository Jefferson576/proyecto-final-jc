document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const mensaje = document.getElementById("mensaje");

  try {
    const API_BASE = (window.location.port === '8080' ? 'http://localhost:3000' : '');
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      window.location.href = "/index.html"; //redirige al inicio
    } else {
      mensaje.textContent = data.mensaje || "Error al iniciar sesión";
    }
  } catch (err) {
    mensaje.textContent = "Error de conexión";
  }
});
