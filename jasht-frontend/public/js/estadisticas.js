// Página de estadísticas basada en los juegos del usuario
document.addEventListener("DOMContentLoaded", async () => {
    const API_URL = "/games";
    const token = localStorage.getItem("token");

    try {
        // Detectar rol admin
        let esAdmin = false;
        try { const datos = JSON.parse(atob((token||'').split('.')[1])); esAdmin = datos.role === 'admin'; } catch(_){}

        // Fuente de datos:
        // - Usuario: su biblioteca (/games)
        // - Admin: catálogo público (/catalog)
        let juegos = [];
        if (esAdmin) {
            const catRes = await fetch('/catalog');
            juegos = await catRes.json();
        } else {
            const res = await fetch(API_URL, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            juegos = await res.json();
        }

        const contEst = document.querySelector(".estadisticas-container");
        if (!Array.isArray(juegos) || juegos.length === 0) {
            if (!esAdmin) {
                contEst.innerHTML = "<p>No hay datos de juegos disponibles.</p>";
                return;
            }
        }

        // Cálculos: totales y promedio de rating
        const totalJuegos = Array.isArray(juegos) ? juegos.length : 0;
        const promedioRating = totalJuegos ? (juegos.reduce( (acc, j) => acc + (j.rating || 0), 0) / totalJuegos) : 0;

        // Actualizar valores en pantalla
        document.getElementById("total-juegos").textContent = totalJuegos;
        document.getElementById("promedio-rating").textContent = promedioRating.toFixed(1);

        // Datos para gráficos: nombres de juegos y categorías agregadas
        const nombresJuegos = (Array.isArray(juegos) ? juegos : []).map( (j) => j.title);

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


        

        // Gráfico de distribución de juegos por categoría
        if (cantidadCategorias.length) {
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
        }

        // Si es admin, cargar y mostrar estadísticas globales
        if (esAdmin) {
            const adminRes = await fetch('/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
            if (adminRes.ok) {
                const adminStats = await adminRes.json();
                const cont = document.querySelector('.estadisticas-container');
                const section = document.createElement('div');
                section.className = 'admin-stats';
                const mkList = (title, items, renderItem) => {
                    const box = document.createElement('div');
                    const h = document.createElement('h3'); h.textContent = title; box.appendChild(h);
                    const ul = document.createElement('ul');
                    items.forEach(x => { const li = document.createElement('li'); li.innerHTML = renderItem(x); ul.appendChild(li); });
                    box.appendChild(ul);
                    return box;
                };
                const fmtTitle = (t,d) => `${t || 'Sin título'}${d ? ' — ' + d : ''}`;
                const topCopies = mkList('Juegos con más copias privadas', (adminStats.topCopies||[]).slice(0,10), (x) => `${fmtTitle(x.title,x.developer)} — copias: <strong>${x.count}</strong>`);
                const best = mkList('Mejor valorados (reseñas)', (adminStats.bestReviews||[]).slice(0,10), (x) => `${fmtTitle(x.title,x.developer)} — promedio: <strong>${Number(x.avgRating).toFixed(1)}/5</strong> (${x.reviewsCount} reseñas)`);
                const worst = mkList('Peor valorados (reseñas)', (adminStats.worstReviews||[]).slice(0,10), (x) => `${fmtTitle(x.title,x.developer)} — promedio: <strong>${Number(x.avgRating).toFixed(1)}/5</strong> (${x.reviewsCount} reseñas)`);
                section.appendChild(topCopies);
                section.appendChild(best);
                section.appendChild(worst);
                cont.appendChild(section);
            }
        }
    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
    }
}
);