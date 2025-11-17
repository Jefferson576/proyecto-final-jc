// Maneja el inicio de sesión del usuario y guarda el token
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const mensaje = document.getElementById("mensaje");

  try {
    // Base de la API: usa localhost en desarrollo (cuando el frontend está en 8080)
    const API_BASE = (window.location.port === '8080' ? 'http://localhost:3000' : '');
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      // Redirección según rol: admin a estadísticas, usuario al inicio
      try {
        const payload = JSON.parse(atob(String(data.token).split('.')[1]));
        if (payload && payload.role === 'admin') {
          window.location.href = "/html/estadisticas.html";
        } else {
          window.location.href = "/index.html";
        }
      } catch(_){
        window.location.href = "/index.html";
      }
    } else {
      mensaje.textContent = data.mensaje || "Error al iniciar sesión";
    }
  } catch (err) {
    mensaje.textContent = "Error de conexión";
  }
});
