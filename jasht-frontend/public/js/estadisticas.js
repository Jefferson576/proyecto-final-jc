document.addEventListener("DOMContentLoaded", async () => {
    const API_URL = "/games";
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(API_URL, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const juegos = await res.json();

        if (!Array.isArray(juegos) || juegos.length === 0) {
            document.querySelector(".estadisticas-container").innerHTML = "<p>No hay datos de juegos disponibles.</p>";
            return;
        }

        // promedios 
        const totalJuegos = juegos.length;
        const totalHoras = juegos.reduce( (acc, j) => acc + (j.hoursPlayed || 0), 0);
        const promedioRating = juegos.reduce( (acc, j) => acc + (j.rating || 0), 0) / totalJuegos;

        // Actualizar valores en pantalla
        document.getElementById("total-juegos").textContent = totalJuegos;
        document.getElementById("total-horas").textContent = totalHoras.toFixed(1);
        document.getElementById("promedio-rating").textContent = promedioRating.toFixed(1);

        // Datos para gráficos 
        const nombresJuegos = juegos.map( (j) => j.title);
        const horasJuegos = juegos.map( (j) => j.hoursPlayed || 0);

        // Contar categorías agrupando por palabra o subcategoría
const categorias = {};

juegos.forEach((j) => {
  // Si no tiene categoría, poner "Desconocida"
  const texto = j.category || "Desconocida";

  // Separar por comas y limpiar espacios
  const lista = texto.split(",").map((c) => c.trim().toLowerCase());

  // Contar cada subcategoría individualmente
  lista.forEach((cat) => {
    categorias[cat] = (categorias[cat] || 0) + 1;
  });
});

// Obtener nombres y cantidades
const nombresCategorias = Object.keys(categorias);
const cantidadCategorias = Object.values(categorias);


        // Gráfico 1: Horas jugadas por juego 
        new Chart(document.getElementById("graficoHoras"),{
            type: "bar",
            data: {
                labels: nombresJuegos,
                datasets: [{
                    label: "Horas jugadas",
                    data: horasJuegos,
                    backgroundColor: "#00adee",
                }, ],
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    },
                },
            },
        });

        // Gráfico 2: Juegos por categoría 
        new Chart(document.getElementById("graficoCategorias"),{
            type: "pie",
            data: {
                labels: nombresCategorias,
                datasets: [{
                    label: "Juegos",
                    data: cantidadCategorias,
                    backgroundColor: ["#00adee", "#ff6384", "#36a2eb", "#ffcd56", "#4bc0c0", "#9966ff", ],
                }, ],
            },
            options: {
                responsive: true,
            },
        });
    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
    }
}
);