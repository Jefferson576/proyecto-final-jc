document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const mensaje = document.getElementById("mensaje");

  if (password !== confirmPassword) {
    mensaje.textContent = "Las contraseñas no coinciden.";
    mensaje.style.color = "red";
    return;
  }

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      mensaje.textContent = "Registro exitoso. Redirigiendo...";
      mensaje.style.color = "limegreen";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      mensaje.textContent = data.mensaje || "Error al registrarse.";
      mensaje.style.color = "red";
    }
  } catch (err) {
    mensaje.textContent = "Error de conexión con el servidor.";
    mensaje.style.color = "red";
  }
});
