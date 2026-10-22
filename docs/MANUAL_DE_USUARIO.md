# CineTracker: manual de usuario

CineTracker es una aplicación de escritorio para llevar el registro de las películas y series que ves: las guardas en tu catálogo, las calificas del 1 al 10, ves sus tráilers, armas listas y recibes recomendaciones según tu gusto. Todo se guarda en tu computador; no hay servidor ni red social.

---

## 1. Instalación

Necesitas Windows 10 u 11 de 64 bits y conexión a internet para buscar títulos, ver tendencias y tráilers. Lo que ya está en tu catálogo, incluidos los pósters, funciona sin internet.

Hay dos formas de usar la aplicación (las dos se descargan de la página de versiones en GitHub):

| Archivo | Para qué |
|---|---|
| `CineTracker-Setup-1.1.0.exe` | Instalador: crea accesos directos en el escritorio y en el menú Inicio. Recomendado. |
| `CineTracker-Portable-1.1.0.exe` | Versión portátil: se abre con doble clic, sin instalar. Útil en un computador prestado. |

La aplicación viene lista para usar: ya trae la clave de TMDB, así que la búsqueda, las tendencias, los tráilers, las sagas y los próximos estrenos funcionan apenas la abres. Las recomendaciones escritas por inteligencia artificial son opcionales: sin clave de Gemini, la aplicación recomienda según tus géneros favoritos, y si quieres las de IA pegas tu propia clave de Gemini en Perfil > Claves de API (sección 11).

### Aviso "Windows protegió su PC"

El instalador no tiene una firma digital comercial, así que Windows puede mostrar este aviso la primera vez. Para continuar:

1. Haz clic en **Más información**.
2. Haz clic en **Ejecutar de todas formas**.

Después sigue el asistente de instalación, que está en español. Puedes elegir la carpeta donde se instala.

---

## 2. Presentación y primer uso

### La presentación

La primera vez que abres la aplicación aparece una presentación de cuatro pasos que explica para qué sirve CineTracker y qué puedes hacer: tu catálogo, la ficha de cada título (tráiler, saga, dónde verla) y las recomendaciones y estadísticas.

- **Siguiente** y **Atrás** (o las flechas del teclado) cambian de paso; la barra de abajo muestra en cuál vas y permite saltar a cualquiera.
- **Saltar presentación** (o **Esc**) entra directo a la aplicación.
- Solo aparece esa primera vez. Si quieres verla de nuevo, ve a Perfil > Apariencia > **Ver la presentación**.

### Invitado o cuenta

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

- **Barra lateral:** el botón junto al logo (o **Ctrl+B**) la contrae para dejar solo los íconos; al pasar el mouse por un ícono aparece su nombre. La aplicación recuerda cómo la dejaste.
- **Escenario principal:** ocupa la primera pantalla. Pasan hasta 8 títulos, uno cada 7 segundos, con su imagen de fondo. Primero aparecen los tuyos (los que estás viendo, recomendaciones y los recién agregados) y se completan con las tendencias.
  - El contador (`02 / 08`) y la barra verde muestran cuánto falta para el siguiente.
  - El botón redondo de **pausa** detiene el carrusel; también se detiene mientras tienes el mouse sobre los botones o las tarjetas.
  - Haz clic en uno de los pósters de la derecha para mostrarlo de inmediato.
  - **Ver título** abre la ficha; **Agregar al catálogo** guarda un título de tendencias; **Ver tráiler** reproduce su tráiler.
- **Franja de números:** bajo el escenario ves tus totales (títulos, viendo, completados, horas, nota media) y el cambio frente al mes pasado.
- **Sigue viendo**, **Nuevos episodios**, **Recomendados para ti**, **Tendencias de la semana** y **Agregados recientemente** aparecen más abajo.
- **Nuevos episodios** avisa cuando una serie que estás viendo (o que terminaste y sigue al aire) estrenó un episodio en los últimos 30 días que todavía no marcas, o estrena uno en las próximas dos semanas. Ver "Episodios" en la sección 5.

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
- **En mis plataformas** (aparece si elegiste tus plataformas en Perfil) deja solo los pendientes y los que estás viendo que están incluidos en los servicios que pagas. La primera vez tarda unos segundos porque consulta cada título.

---

## 5. Ficha de un título

Al abrir un título ves su póster inclinado sobre un fondo con el color del póster, y a la izquierda:

- **Estado:** Pendiente, Viendo, Completado o Abandonado.
- **Tu puntuación:** haz clic en un número del 1 al 10.
- **Marcar como visto:** registra que lo viste hoy (queda en el **Historial**, más abajo) y lo pasa a Completado.
- **Ver tráiler:** ver la sección 6.
- **Reparto**, **sinopsis**, **géneros** y **notas** personales.

Los botones redondos de la derecha sirven para volver, ir al título anterior o siguiente (también con las flechas del teclado), editar, agregar a listas y eliminar. Eliminar pide confirmación y no se puede deshacer.

### Dónde verla

Debajo del póster, **Dónde verla** muestra en qué plataformas está el título en Colombia, de forma legal, agrupadas en **Incluida en suscripción**, **Gratis**, **Alquiler** y **Compra**. Cada plataforma abre su página en tu navegador; las principales (Netflix, Disney+, Prime Video, Apple TV, Google Play, YouTube) abren directamente la búsqueda del título, y el resto la página de TMDB con todas las opciones. Los datos son de JustWatch, a través de TMDB.

### Títulos que aún no tienes

Cualquier tarjeta de un título que no está en tu catálogo (tendencias, Descubrir, Estrenos, parecidas o resultados de búsqueda) se abre con un clic, igual que tus títulos: ves la sinopsis, el reparto, el tráiler, dónde verla, **¿Te va a gustar?** y lo que sigue, sin tener que agregarla. En el escenario del Inicio, las tendencias tienen el botón **Ver detalles**. Desde ahí, **Agregar a pendientes** la guarda para verla después y **Ya la vi** la guarda como completada para que la califiques.

### Episodios (series)

En las series que vienen de TMDB aparece **Episodios**:

- La barra muestra cuántos episodios estrenados llevas vistos, y **Siguiente** te dice cuál toca (por ejemplo `T1 · E04`). **Marcar como visto** lo marca con un clic.
- Las pestañas **T1, T2…** muestran cada temporada con sus episodios, fechas y duración. Haz clic en el cuadro de un episodio para marcarlo o desmarcarlo, o usa **Marcar temporada vista**. Los que aún no se estrenan dicen cuándo salen, y una temporada anunciada sin episodios dice **Pronto**.
- Al marcar el primer episodio de una serie pendiente, pasa sola a **Viendo**.

### ¿Te va a gustar?

Compara el título con tu gusto. Si todavía no lo calificas, te da una **nota probable** (según cómo calificas sus géneros) con su nivel de confianza, los motivos y los títulos tuyos a los que se parece. Si ya lo calificaste, explica **por qué te gustó** o **por qué no te convenció**. Con una clave de Gemini aparece **Analizar con IA**, que lo explica con palabras; la respuesta se guarda y se avisa si tus notas cambian después.

### Quién la hace

Muestra la dirección (o la creación, en series) y el reparto con su foto. **Seguir** agrega a esa persona a **Estrenos** (sección 10).

### Lo que sigue

Al bajar en la ficha de un título que viene de TMDB aparecen:

- **La saga en orden** (películas): todas las partes de la colección por fecha de estreno, numeradas. La que estás viendo dice **Estás aquí**, la siguiente dice **Sigue** y las que todavía no se estrenan dicen **Próximamente** con su fecha. Por ejemplo, en "Duna" ves Duna (1), Duna: Parte dos (2, Sigue) y Duna: Parte tres (3, Próximamente).
- **Temporadas en orden** (series): cada temporada con su número de episodios y año, las que vienen marcadas como Próximamente y, si ya está anunciado, el próximo episodio con su fecha.
- **Parecidas:** títulos recomendados por TMDB a partir de este.
- **Próximos estrenos:** películas o series del mismo género que todavía no salen, ordenadas por fecha de estreno.

Las que ya están en tu catálogo muestran su estado y tu puntuación, y se abren con un clic. Las demás tienen el botón **Agregar**, que las guarda en tu catálogo como Pendiente.

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

Las listas que guardas desde **Descubrir** conservan su presentación y el motivo de cada título (**¿Por qué este?**).

---

## 8. Estadísticas y recomendaciones

**Estadísticas** muestra tus totales con la variación del último mes, las visualizaciones completadas por mes (últimos 12 meses), tus títulos por estado, los géneros mejor calificados y los títulos por género. Cada gráfica tiene **Ver como tabla**. Además:

- **Tu perfil de cinéfilo:** un retrato de tu gusto con un apodo (por ejemplo "Fan del terror"), un resumen, tus rasgos con los números que los respaldan y un **punto ciego**: algo que casi no has visto y te podría gustar. Con una clave de Gemini lo escribe la IA y se guarda; **Actualizar retrato** lo vuelve a escribir. Necesita al menos 3 títulos vistos.
- **Reto del año:** ponte una meta ("ver 50 películas este año") de títulos, películas o series. La barra muestra tu avance, la raya blanca indica dónde deberías ir hoy y el texto te dice si vas adelantado o cuántas te faltan por semana. Cada título cuenta una vez, el año en que lo terminaste.
- **Tu racha:** cuántas semanas seguidas has visto algo (una película, una serie o un episodio), tu mejor racha y las últimas 26 semanas. Si esta semana aún no ves nada, te avisa para que no la pierdas.
- **Tu año en cine** (botón arriba a la derecha): el resumen de un año: títulos, horas, mes más intenso, tu día favorito para ver algo, la racha más larga, lo mejor y lo peor, lo que repetiste, tus géneros y los "premios del año". Con Gemini, la IA escribe el titular, la historia y los premios (solo a títulos que de verdad viste ese año). Puedes cambiar de año arriba.

**Recomendados para ti** (en el Inicio) elige títulos de tu lista de pendientes:

- Con una clave de Google Gemini, la inteligencia artificial elige hasta 5 y explica cada uno; haz clic en **¿Por qué este?** para leer el motivo.
- Necesita al menos 3 títulos calificados y algunos en Pendiente.
- Sin clave, sin internet o si la IA falla, la aplicación recomienda según tus géneros favoritos (los que calificaste con 8 o más) y te dice el motivo.
- **Actualizar** pide recomendaciones nuevas.

---

## 9. Descubrir

**Descubrir** (en la barra lateral) busca cosas nuevas para ti. Todo lo que propone existe en TMDB: la IA solo elige y explica, nunca inventa títulos.

### ¿Qué veo esta noche?

1. Escribe cómo estás y cuánto tiempo tienes, por ejemplo "algo ligero, 90 minutos, estoy cansado", o elige una de las ideas de abajo.
2. Elige el **Tiempo** (sin límite, hasta 90 min, hasta 2 h o un episodio) y **De dónde**: tus pendientes, algo nuevo o ambos. Si tienes plataformas, puedes marcar **Solo en mis plataformas**.
3. Haz clic en **Elige por mí**. Recibes tres opciones con el motivo de cada una; **Otras tres** pide otras.

Sin clave de Gemini, la aplicación entiende palabras como "miedo", "reír", "llorar", "pareja" o "90 minutos" y elige según tus géneros favoritos.

### Listas para ti

1. Elige un **estilo**: la aplicación los detecta en lo que ves (por ejemplo "Terror · 14 vistos · media 8,5", "Terror y misterio", "Cine de los 90" o "Lo mejor de tu gusto").
2. Elige **Películas** o **Series** y, si quieres, ajústala: **Más oscuro**, **Más corto**, **Menos conocido**, **Reciente**, **Clásico** o **En mis plataformas**.
3. Haz clic en **Armar lista**. Recibes hasta 10 títulos que aún no tienes, cada uno con su motivo, por ejemplo: "Como te encantó Hereditary, esta tiene el mismo terror lento y familiar".

En cada título puedes **Agregar** (queda como pendiente) o decir **No me interesa** (no se volverá a sugerir; el aviso tiene **Deshacer**). **Guardar como lista** crea la lista con todos y agrega a tu catálogo, como pendientes, los que no tenías. **Otra versión** arma una nueva.

### ¿Cuál era esa película?

Describe lo que recuerdas ("un tipo revive el mismo día en una guerra contra aliens") y haz clic en **Encontrarla**. La IA propone hasta cinco títulos, cada uno con la pista que coincide y qué tan probable es, y solo se muestran los que existen en TMDB. Sin clave de Gemini se busca el texto tal cual en TMDB, que encuentra títulos por nombre pero no por trama.

---

## 10. Estrenos

**Estrenos** muestra, mes a mes, lo que sale en el próximo año de lo que sigues:

- **Personas:** directores, creadores y actores que seguiste desde la ficha de un título (**Quién la hace → Seguir**). Quítalas con la **X**.
- **Géneros:** mientras no elijas ninguno, se siguen tus dos géneros favoritos (marcados "favorito"). **Elegir géneros** te deja escoger los tuyos.

Cada estreno dice su fecha y por qué aparece ("Denis Villeneuve dirige esta película."), y se puede **Agregar** como pendiente.

---

## 11. Perfil y ajustes

Haz clic en tu nombre (abajo a la izquierda) para abrir **Perfil y ajustes**:

- **Perfil:** cambia tu nombre y tu foto (PNG, JPEG o WebP).
- **Apariencia:** tema oscuro o claro (también con el botón de la barra lateral), el **fondo** de metal líquido animado o quieto (quieto si tu computador va lento) y el botón para ver de nuevo la **presentación**.
- **Mis plataformas:** marca los servicios de streaming que pagas (Netflix, Prime Video, Disney+, Max…). Se usan en Descubrir, en ¿Qué veo esta noche? y en el filtro del Catálogo. Los datos son de JustWatch para Colombia.
- **Tus datos:**
  - **Exportar:** **Copia de CineTracker (CSV)** guarda todo tu catálogo (estados, notas, puntuaciones y las fechas en que viste cada título) y se puede volver a importar. **Para Letterboxd (CSV)** guarda tus películas vistas en el formato del importador de Letterboxd (letterboxd.com/import).
  - **Importar:** **Elegir archivo CSV** acepta la exportación de Letterboxd (diary.csv, ratings.csv, watched.csv o watchlist.csv), la de IMDb (tus calificaciones o tu Watchlist) o una copia de CineTracker. Antes de importar ves cuántos títulos trae y una muestra; si es una lista de Letterboxd, indicas si **Ya las vi** o **Quiero verlas**. Cada título se busca en TMDB (exacto cuando el archivo trae el código de IMDb). Lo que ya tienes no se sobrescribe: solo se completa lo que falta (puntuación, fechas vistas). Al final ves cuántos se agregaron, cuántos se completaron y la lista de los que no se encontraron.
- **Contraseña:** cámbiala escribiendo la actual y la nueva.
- **Claves de API:**
  - **TMDB** es necesaria para buscar títulos, ver tendencias y tráilers. Consíguela gratis en themoviedb.org (botón **Conseguir una clave**).
  - **Google Gemini** es opcional y activa todo lo escrito por IA: recomendaciones, listas de Descubrir, ¿Qué veo esta noche?, la búsqueda por descripción, tu perfil de cinéfilo, tu año en cine y el análisis de cada título. Consíguela en Google AI Studio. Sin ella todo sigue funcionando con reglas, y cada pantalla te dice cuándo es así.
  - Pega la clave y haz clic en **Guardar**; la aplicación la prueba sola y te dice si funciona. **Probar clave** la vuelve a comprobar y **Quitar** la borra.
  - Las claves se guardan cifradas con Windows y no se vuelven a mostrar. Una clave guardada aquí reemplaza la que trae la instalación.
- **Eliminar cuenta:** borra tu cuenta con todos sus títulos, historial y listas. Pide tu contraseña y no se puede deshacer.

**Cerrar sesión** está debajo de tu nombre; también olvida la sesión guardada en este equipo.

---

## 12. Problemas frecuentes

| Problema | Qué hacer |
|---|---|
| "TMDB no está configurado" o la búsqueda no funciona | Agrega una clave de TMDB en Perfil > Claves de API, o usa el instalador que trae las claves. |
| "No se pudo conectar con TMDB" | Revisa tu conexión a internet. Tu catálogo sigue funcionando sin internet. |
| Las recomendaciones dicen "según tus géneros" | Falta la clave de Gemini, no hay internet o tienes menos de 3 títulos calificados. El aviso sobre la fila explica el motivo exacto. |
| Descubrir dice "Aún no conocemos tu gusto" | Marca como vistos y califica al menos dos títulos. |
| Un título del archivo importado "no se encontró" | El nombre o el año no coinciden con TMDB. Agrégalo a mano desde el Catálogo. |
| "Episodios" no aparece en una serie | Solo aparece en series agregadas desde TMDB. |
| El tráiler no carga | Revisa tu conexión. Si el dueño del video no permite verlo fuera de YouTube, usa **Ver en YouTube**. |
| Tengo que iniciar sesión cada vez | Al iniciar sesión, deja marcada **Mantener la sesión iniciada en este equipo**. |
| Windows no deja abrir el instalador | Ver "Aviso Windows protegió su PC" en la sección 1. |

### Dónde están mis datos

Tu base de datos y la caché de imágenes están en `%APPDATA%\cinetracker`. Antes de cada actualización de la base de datos, la aplicación guarda una copia de seguridad en esa misma carpeta (archivos que terminan en `.bak`).

---

La información y las imágenes de películas y series provienen de TMDB. Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica. Los tráilers se reproducen desde YouTube y las recomendaciones con IA usan Google Gemini.
