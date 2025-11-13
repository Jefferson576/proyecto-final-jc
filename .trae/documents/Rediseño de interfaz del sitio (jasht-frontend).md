## Objetivo y alcance

* Rediseñar la UI del frontend en `jasht-frontend/public` manteniendo la lógica actual.

* Páginas afectadas: `index.html`, `html/login.html`, `html/register.html`, `html/forgot.html`, `html/reset.html`, `html/juego.html`, `html/insertar.html`, `html/estadisticas.html`.

* Backend (`jasht-backend`) sin cambios.

## Estado actual (inventario)

* HTML: `public/index.html`, `public/html/*.html`.

* CSS: `public/style.css` y específicos en `public/css/*.css`.

* JS: `public/app.js` y específicos en `public/js/*.js`.

* Activos: `public/img/logo.png`.

## Lineamientos de diseño

* Tipografía: sistema (`-apple-system, Segoe UI, Roboto, Inter, sans-serif`) o Google Fonts (opcional).

* Paleta: `--color-primary` (azul/verde), `--color-secondary`, `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-success`, `--color-danger`.

* Escala 8px (4/8/16/24/32) para espaciado y radii.

* Componentes: barra superior, footer, contenedor, tarjeta, botón, input/select, tabla, alerta.

* Responsivo: puntos de corte `480px`, `768px`, `1024px`.

* Accesibilidad: contraste AA, focus visible, tamaños táctiles ≥44px.

## Implementación técnica

* Crear `public/css/tokens.css` con variables CSS (colores, tipografía, espaciado, sombras).

* Crear `public/css/base.css` con reset ligero, tipografía y layout base.

* Crear `public/css/components.css` (botones, inputs, tarjetas, tablas, alertas, header/footer).

* Actualizar HTMLs para enlazar `tokens.css`, `base.css`, `components.css` además del CSS específico.

* Unificar estilos de botones: `.btn`, `.btn-primary`, `.btn-secondary`, estados `:hover`, `:disabled`.

* Formularios: `.form`, `.form-field`, labels visibles, mensajes de error, estados de validación.

* Layout común: header con `logo.png`, nav mínimo, contenedor central, footer consistente.

* Mantener clases usadas por JS o proporcionar equivalentes (evitar romper eventos).

## Cambios por página

* `index.html`: hero con título, subtítulo, CTA y tarjeta informativa.

* `login/register/reset/forgot`: tarjeta centrada con formulario, feedback de error/success, enlaces auxiliares.

* `juego.html`: header fijo, panel de estado (puntos/tiempo), área de juego, botón primario, alerta de fin.

* `insertar.html`: formulario administrativo con grupos claros, tabla/resumen si aplica, validaciones visibles.

* `estadisticas.html`: grid de tarjetas con métricas, tabla estilizada; opcional placeholders para gráficos futuros.

## Accesibilidad y UX

* Contraste AA, `:focus-visible` personalizado, orden de tab correcto.

* Aria en alertas y región principal (`role="main"`).

* Estados de carga y deshabilitado en acciones.

## Rendimiento

* Reutilizar componentes para reducir CSS total.

* Optimizar imágenes si es necesario; evitar fuentes pesadas salvo aprobación.

## Verificación y entregables

* Vista previa local de cada página en desktop/tablet/móvil.

* Checklist de accesibilidad básica (focus, contraste, labels).

* Validación de que los scripts (`public/js/*.js`) siguen funcionando (clases y selectores).

## Plan de trabajo

* Fase 1: `tokens.css` + `base.css` + header/footer; aplicar en `index.html`.

* Fase 2: `components.css` (botones/inputs/tarjetas) y formularios (`login/register/forgot/reset`).

* Fase 3: Layout de `juego.html` con panel de estado y área de juego.

* Fase 4: `insertar.html` y `estadisticas.html` (tablas, tarjetas).

* Fase 5: QA responsivo y accesibilidad; ajustes de JS si fuera necesario.

## Supuestos y riesgos

* No se introduce framework ni bundler; solo HTML/CSS/JS estáticos.

* Riesgo: cambio de clases rompa selectores JS; mitigación: mantener/alias de clases y probar cada página.

## Solicitud de confirmación

* Indicar preferencia de paleta (ej., azul/verde/rojo) y si desea modo oscuro.

* Indicar preferencia de tipografía (sistema vs Google Fonts).

