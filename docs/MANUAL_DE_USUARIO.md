# CineTracker: manual de usuario

CineTracker es una aplicación de escritorio para llevar el registro de las películas y series que ves: las guardas en tu catálogo, las calificas del 1 al 10, ves sus tráilers, armas listas y recibes recomendaciones según tu gusto. Todo se guarda en tu computador; no hay servidor ni red social.

---

## 1. Instalación

Necesitas Windows 10 u 11 de 64 bits y conexión a internet para buscar títulos, ver tendencias y tráilers. Lo que ya está en tu catálogo, incluidos los pósters, funciona sin internet.

Hay dos formas de usar la aplicación:

| Archivo | Para qué |
|---|---|
| `CineTracker-Setup-1.0.0.exe` | Instalador: crea accesos directos en el escritorio y en el menú Inicio. Recomendado. |
| `CineTracker-Portable-1.0.0.exe` | Versión portátil: se abre con doble clic, sin instalar. Útil en un computador prestado. |

Los archivos que terminan en `-sin-claves` son la misma aplicación sin las claves de TMDB y Gemini incluidas; quien los use pone sus propias claves (ver la sección 9).

### Aviso "Windows protegió su PC"

El instalador no tiene una firma digital comercial, así que Windows puede mostrar este aviso la primera vez. Para continuar:

1. Haz clic en **Más información**.
2. Haz clic en **Ejecutar de todas formas**.

Después sigue el asistente de instalación, que está en español. Puedes elegir la carpeta donde se instala.

---

## 2. Primer uso: invitado o cuenta

Al abrir la aplicación llegas al **Inicio**. Sin cuenta puedes:

- Ver las películas y series en tendencia de la semana.
- Ver sus tráilers.

Para guardar títulos, calificarlos o crear listas necesitas una cuenta (es local y gratis):

1. Haz clic en **Iniciar sesión** (abajo a la izquierda).
2. Elige **Crea una cuenta** y escribe tu nombre, correo y una contraseña de al menos 6 caracteres.
3. Deja marcada la casilla **Mantener la sesión iniciada en este equipo** si no quieres volver a iniciar sesión cada vez que abras la aplicación. Desmárcala en un computador compartido.

Si intentas hacer algo que requiere cuenta (por ejemplo, agregar un título), la aplicación te pide iniciar sesión y, al terminar, completa la acción que querías hacer.

En un mismo computador puede haber varias cuentas; cada una solo ve sus propios títulos, historial y listas.

---

## 3. Inicio

- **Escenario principal:** ocupa la primera pantalla. Pasan hasta 8 títulos, uno cada 7 segundos, con su imagen de fondo. Primero aparecen los tuyos (los que estás viendo, recomendaciones y los recién agregados) y se completan con las tendencias.
  - El contador (`02 / 08`) y la barra verde muestran cuánto falta para el siguiente.
  - El botón redondo de **pausa** detiene el carrusel; también se detiene mientras tienes el mouse sobre los botones o las tarjetas.
  - Haz clic en uno de los pósters de la derecha para mostrarlo de inmediato.
  - **Ver título** abre la ficha; **Agregar al catálogo** guarda un título de tendencias; **Ver tráiler** reproduce su tráiler.
- **Franja de números:** bajo el escenario ves tus totales (títulos, viendo, completados, horas, nota media) y el cambio frente al mes pasado.
- **Sigue viendo**, **Recomendados para ti**, **Tendencias de la semana** y **Agregados recientemente** aparecen más abajo.

---

## 4. Catálogo

Aquí están todos tus títulos.

### Agregar un título

1. Haz clic en **Agregar título**.
2. Escribe el nombre de la película o serie. Los resultados de TMDB aparecen mientras escribes; puedes moverte con las flechas del teclado y elegir con Enter.
3. Revisa la vista previa (póster, año, géneros, sinopsis y reparto) y haz clic en **Guardar en mi catálogo**.

Si el título no está en TMDB, usa **Agregar a mano** y completa los datos que sepas. En el campo de géneros puedes escribirlos en español, separados por comas.

### Buscar, filtrar y ordenar

- La caja **Buscar en tus títulos** filtra por nombre.
- Los botones de estado (**Todos, Viendo, Pendiente, Completado, Abandonado**) muestran cuántos títulos hay en cada uno.
- **Género** y **Orden** (agregados recientemente, título A–Z, mejor puntuación, estreno más reciente o más antiguo).
- Los dos botones de la derecha cambian entre **cuadrícula** y **lista**. La aplicación recuerda tu vista y tu orden.

---

## 5. Ficha de un título

Al abrir un título ves su póster inclinado sobre un fondo con el color del póster, y a la izquierda:

- **Estado:** Pendiente, Viendo, Completado o Abandonado.
- **Tu puntuación:** haz clic en un número del 1 al 10.
- **Marcar como visto:** registra que lo viste hoy (queda en el **Historial**, más abajo) y lo pasa a Completado.
- **Ver tráiler:** ver la sección 6.
- **Reparto**, **sinopsis**, **géneros** y **notas** personales.

Los botones redondos de la derecha sirven para volver, ir al título anterior o siguiente (también con las flechas del teclado), editar, agregar a listas y eliminar. Eliminar pide confirmación y no se puede deshacer.

---

## 6. Tráilers

El botón **Ver tráiler** aparece en el escenario del Inicio y en la ficha de cualquier título que venga de TMDB.

- Se abre una pantalla negra con el tráiler, que empieza a reproducirse solo. La aplicación elige primero tráilers oficiales en español; si no hay, usa el de inglés o un avance.
- Usa los controles de YouTube para pausar, cambiar el volumen, activar subtítulos o ver en pantalla completa.
- **Ver en YouTube** abre el video en tu navegador.
- Cierra con la **X** o con la tecla **Esc**; el video se detiene al cerrar. Mientras el tráiler está abierto, el carrusel del Inicio se queda quieto.

Si TMDB no tiene tráiler para un título, la pantalla te lo indica. Ver tráilers necesita internet.

---

## 7. Listas

En **Listas** puedes agrupar títulos a tu manera (por ejemplo, "Noche de terror del viernes"):

1. Escribe el nombre en **Nueva lista** y haz clic en **Crear lista**.
2. Dentro de la lista, elige un título de tu catálogo y haz clic en **Agregar**. También puedes agregarlo desde la ficha del título con el botón de listas.
3. Puedes **renombrar** o **eliminar** la lista; al eliminarla, los títulos siguen en tu catálogo.

---

## 8. Estadísticas y recomendaciones

**Estadísticas** muestra tus totales con la variación del último mes, las visualizaciones completadas por mes (últimos 12 meses), tus títulos por estado, los géneros mejor calificados y los títulos por género. Cada gráfica tiene **Ver como tabla**.

**Recomendados para ti** (en el Inicio) elige títulos de tu lista de pendientes:

- Con una clave de Google Gemini, la inteligencia artificial elige hasta 5 y explica cada uno; haz clic en **¿Por qué este?** para leer el motivo.
- Necesita al menos 3 títulos calificados y algunos en Pendiente.
- Sin clave, sin internet o si la IA falla, la aplicación recomienda según tus géneros favoritos (los que calificaste con 8 o más) y te dice el motivo.
- **Actualizar** pide recomendaciones nuevas.

---

## 9. Perfil y ajustes

Haz clic en tu nombre (abajo a la izquierda) para abrir **Perfil y ajustes**:

- **Perfil:** cambia tu nombre y tu foto (PNG, JPEG o WebP).
- **Apariencia:** tema oscuro o claro. También puedes cambiarlo con el botón **Modo claro / Modo oscuro** de la barra lateral.
- **Contraseña:** cámbiala escribiendo la actual y la nueva.
- **Claves de API:**
  - **TMDB** es necesaria para buscar títulos, ver tendencias y tráilers. Consíguela gratis en themoviedb.org (botón **Conseguir una clave**).
  - **Google Gemini** es opcional y activa las recomendaciones escritas por IA. Consíguela en Google AI Studio.
  - Pega la clave y haz clic en **Guardar**; la aplicación la prueba sola y te dice si funciona. **Probar clave** la vuelve a comprobar y **Quitar** la borra.
  - Las claves se guardan cifradas con Windows y no se vuelven a mostrar. Una clave guardada aquí reemplaza la que trae la instalación.
- **Eliminar cuenta:** borra tu cuenta con todos sus títulos, historial y listas. Pide tu contraseña y no se puede deshacer.

**Cerrar sesión** está debajo de tu nombre; también olvida la sesión guardada en este equipo.

---

## 10. Problemas frecuentes

| Problema | Qué hacer |
|---|---|
| "TMDB no está configurado" o la búsqueda no funciona | Agrega una clave de TMDB en Perfil > Claves de API, o usa el instalador que trae las claves. |
| "No se pudo conectar con TMDB" | Revisa tu conexión a internet. Tu catálogo sigue funcionando sin internet. |
| Las recomendaciones dicen "según tus géneros" | Falta la clave de Gemini, no hay internet o tienes menos de 3 títulos calificados. El aviso sobre la fila explica el motivo exacto. |
| El tráiler no carga | Revisa tu conexión. Si el dueño del video no permite verlo fuera de YouTube, usa **Ver en YouTube**. |
| Tengo que iniciar sesión cada vez | Al iniciar sesión, deja marcada **Mantener la sesión iniciada en este equipo**. |
| Windows no deja abrir el instalador | Ver "Aviso Windows protegió su PC" en la sección 1. |

### Dónde están mis datos

Tu base de datos y la caché de imágenes están en `%APPDATA%\cinetracker`. Antes de cada actualización de la base de datos, la aplicación guarda una copia de seguridad en esa misma carpeta (archivos que terminan en `.bak`).

---

La información y las imágenes de películas y series provienen de TMDB. Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica. Los tráilers se reproducen desde YouTube y las recomendaciones con IA usan Google Gemini.
