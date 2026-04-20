# Dino Talento · Checklist embebible

App web estática (HTML + CSS + JS vanilla) diseñada para embeberse vía `<iframe>` dentro de la plataforma Human. Implementa el **Programa Formaciones "Tu Desarrollo en Grupo Dinosaurio"** con un checklist por puesto, progreso por módulo, comentarios, exportación a PDF/Excel/CSV y persistencia local por instancia.

## 1. Contenido cargado

La app trae inline los 6 checklists extraídos del modelo oficial `02. MODELO Check list tareas · Programa Formaciones (Guía para mentores).xlsx`:

| Etapa | Puesto | Tareas |
| --- | --- | --- |
| 1 | Referente Venta Mayorista | 12 |
| 2 | Asistente Mall | 19 |
| 3 | Recepcionista Devoluciones | 15 |
| 4 | Asistente de Precios | 13 |
| 5 | Asistente Stock | 9 |
| 6 | Asistente Inventario | 6 |

Total: **74 tareas** distribuidas en 6 etapas.

Cada colaborador que abre el iframe empieza con todas las tareas sin marcar. El progreso y los comentarios se guardan por instancia (ver sección 5).

## 2. Estructura del proyecto

```
dineo-talento/
├── index.html        # Entry point
├── styles.css        # Estilos SaaS (tokens, componentes, responsive)
├── app.js            # Lógica: render, persistencia, exports
├── data.js           # Datos inline + loader opcional de Google Sheets
├── netlify.toml      # Config de deploy + headers para iframe
└── README.md         # Este archivo
```

Todo corre en el browser. No hay build, ni backend, ni dependencias a instalar. Las librerías externas (PapaParse, SheetJS, jsPDF, jsPDF-AutoTable) se cargan por CDN.

## 3. Editar los checklists

### Opción A · Editar inline (recomendado si no cambian seguido)

Los datos están en `data.js`, en la constante `INLINE_STAGES`. Es un array de etapas con esta forma:

```js
{
  id: "asistente-mall",
  name: "Asistente Mall",
  subtitle: "Guía de tareas para la formación de Asistente Mall.",
  groups: [
    {
      name: "Guía de tareas",
      tasks: [
        { id: "tarea-1", title: "Confeccionar informe de indicadores operativos..." },
        // ...
      ]
    }
  ]
}
```

Para editar una tarea: cambiar el `title`. Para agregar una tarea: copiar un objeto del array y cambiar `id` (debe ser único dentro de la etapa) y `title`. Los `id` actúan como clave del localStorage, así que si los cambiás los usuarios existentes pierden el progreso de esa tarea puntual.

### Opción B · Conectar con Google Sheets en vivo

Si el equipo de RRHH va a iterar seguido los checklists y querés evitar redeploys:

1. Subir el Excel a Google Drive y abrirlo en Google Sheets (o copiar el contenido).
2. **Archivo → Compartir → Publicar en la web**. Formato **CSV**, documento completo, republicar automáticamente. Confirmar.
3. Anotar el `SHEET_ID` (entre `/d/` y `/edit` en la URL) y los `gid` de cada tab (en la URL al cambiar de hoja).
4. En `data.js`:
   ```js
   const DATA_SOURCE = "sheet"; // cambiar de "inline" a "sheet"
   const SHEET_CONFIG = {
     sheetId: "TU_SHEET_ID",
     stages: [
       { id: "referente-venta-mayorista", name: "Referente Venta Mayorista", gid: "311259899" },
       { id: "asistente-mall",             name: "Asistente Mall",             gid: "..." },
       // ... una entrada por tab
     ],
   };
   ```
5. Redeploy. La app parsea el CSV de cada tab al cargarse.

Columnas esperadas en cada hoja (case-insensitive, con alias en español e inglés):

| Columna | Alias | Obligatorio |
| --- | --- | --- |
| Tarea | Task / Título / Guía de tareas | Sí |
| Descripción | Description / Detalle | No |
| Grupo | Group / Sección / Categoría | No |
| Responsable | Owner / Asignado | No |
| Plazo | Due / Fecha / Deadline | No |

Si el fetch del Sheet falla (red, permisos, etc.), la app hace fallback automático a los datos inline: nunca queda vacía.

## 4. Deploy en Netlify

### Opción A · Drag & drop (más rápido)

1. Entrar a <https://app.netlify.com/drop>.
2. Arrastrar la carpeta `dineo-talento/` completa al drop zone.
3. Netlify publica y devuelve una URL tipo `https://dino-talento-xxxx.netlify.app`.
4. Opcional: Domain settings → asignar un dominio custom.

### Opción B · Git + CI

1. Subir la carpeta a un repo (GitHub/GitLab/Bitbucket).
2. Netlify → **Add new site → Import an existing project**.
3. Config: Build command vacío · Publish directory `.`
4. Cada push a `main` hace redeploy.

### Headers para embebido en iframe

`netlify.toml` ya viene con:

```toml
X-Frame-Options = "ALLOWALL"
Content-Security-Policy = "frame-ancestors *;"
```

Para restringir a un dominio específico (recomendado para producción), reemplazar `*` por la URL exacta de Human:

```toml
Content-Security-Policy = "frame-ancestors https://app.human.co;"
```

## 5. Persistencia y duplicación de iframes

La app guarda todo en `localStorage` bajo un **namespace por instancia**:

```
dineo:v1:<instanceId>:tasks      → { stageId: { taskId: true } }
dineo:v1:<instanceId>:comments   → { stageId: "texto..." }
dineo:v1:<instanceId>:ui         → { currentStage, collapsed: {...} }
```

### Resolución del `instanceId`

1. Si la URL del iframe trae `?instance=ABC`, se usa `ABC` como namespace.
2. Si no, la app **genera un UUID corto al primer load** y lo fija en la URL con `history.replaceState` (sin reload).

### Qué pasa al duplicar un iframe

- **Con `?instance=USER_ID`** (recomendado, usando el userId de Human): las dos copias apuntan al mismo namespace → mismo colaborador, mismo estado. ✅
- **Sin `?instance`**: cada copia genera un ID distinto al cargar → estado limpio e independiente. ✅ Cumple el requisito "si se duplica el iframe, debe generarse una nueva instancia sin datos previos".

### Límites del localStorage

- Se guarda por origen (dominio Netlify) y por browser. Cambiar de navegador o usar incógnito arranca de cero.
- Límite típico: 5–10 MB por origen, más que suficiente para cientos de checklists.
- Los comentarios se persisten con debounce de 300 ms.

### Migrar a backend (opcional)

Si necesitás persistencia cross-device/cross-browser, reemplazá `readJSON` / `writeJSON` en `app.js` por llamadas a un endpoint. Opciones:

- **Supabase** (tabla por instancia, RLS por userId)
- **Firebase Firestore**
- **Endpoint custom** en Human que reciba `{ instanceId, tasks, comments }`

El resto de la app no cambia: todo el estado fluye por esas dos funciones.

## 6. Código iframe para Human

Hay dos modos de embebido:

### Modo A · Un checklist por iframe (recomendado para pantallas por puesto)

Usar `?stage=<id>` para fijar un checklist específico. La sidebar queda oculta y el iframe muestra únicamente ese puesto.

**IDs disponibles:**
- `referente-venta-mayorista`
- `asistente-mall`
- `recepcionista-devoluciones`
- `asistente-de-precios`
- `asistente-stock`
- `asistente-inventario`

Ejemplo:

```html
<iframe
  src="https://tu-sitio.netlify.app/?stage=asistente-mall&instance={{ user.id }}"
  width="100%"
  height="1200"
  style="border:0; border-radius:12px; background:#f6f7fb;"
  allow="clipboard-write"
  title="Checklist Dino Talento · Asistente Mall"
  loading="lazy"
></iframe>
```

**Herramienta rápida**: abrí `embeds.html` en el deploy (`https://tu-sitio.netlify.app/embeds.html`) o localmente. Tiene los 6 snippets listos para copiar, un preview de cada iframe y un input para cambiar la URL base — todos los snippets se actualizan solos.

### Modo B · Los 6 checklists en un solo iframe (con navegación interna)

Si preferís un único iframe donde el colaborador elige el puesto desde la sidebar:

```html
<iframe
  src="https://tu-sitio.netlify.app/?instance={{ user.id }}"
  width="100%"
  height="900"
  style="border:0; border-radius:12px; background:#f6f7fb;"
  allow="clipboard-write"
  title="Plan de desarrollo Dino Talento"
  loading="lazy"
></iframe>
```

### Notas comunes

- Pasá el `userId` de Human como `?instance=` para que cada colaborador tenga su propio progreso persistente y accesible desde cualquier sesión.
- Si no pasás `?instance`, cada nuevo iframe genera un ID limpio automáticamente (útil para sandboxes/demos).
- El mismo `?instance=` comparte datos entre los 6 checklists: un colaborador puede avanzar tareas de varios puestos sin perder estado.

### Auto-resize opcional

Si Human debe ajustar la altura del iframe al contenido, agregá al final de `app.js`:

```js
const notifySize = () => {
  parent.postMessage({ type: "dino:resize", height: document.body.scrollHeight }, "*");
};
new ResizeObserver(notifySize).observe(document.body);
```

Y en Human:

```js
window.addEventListener("message", (e) => {
  if (e.data?.type === "dino:resize") {
    document.querySelector("#dino-iframe").style.height = e.data.height + "px";
  }
});
```

## 7. Features de la UI

- Sidebar con las 6 etapas + mini barra de progreso por cada una.
- Resumen superior con progreso general, tareas completadas y cantidad de etapas.
- Barra de progreso principal por etapa con % en vivo.
- Checkboxes con feedback visual (tacha la tarea + cambio de fondo).
- Grupos colapsables ("Guía de tareas" por defecto, ampliable si el Sheet tiene columna Grupo).
- Cuadro de comentarios grande por etapa, autosave con debounce 300 ms.
- Botón "Reiniciar progreso" con confirmación (borra tareas + comentarios de esa instancia).
- Export: **Excel (.xlsx)**, **CSV**, **PDF** (con tabla por etapa y comentarios).
- Nombre de archivo incluye instanceId + fecha: `dino-talento-<id>-<YYYY-MM-DD>.ext`.
- Diseño responsive (sidebar colapsa en mobile).

## 8. Checklist pre-producción

- [ ] Confirmar nombres de los 6 puestos.
- [ ] Ajustar el texto del `subtitle` si querés algo distinto a "Guía de tareas para la formación de X".
- [ ] Si querés branding custom, cambiar `--primary` en `styles.css` al color de Grupo Dinosaurio.
- [ ] Deployar en Netlify y anotar la URL final.
- [ ] Restringir `frame-ancestors` al dominio de Human en `netlify.toml`.
- [ ] Embeber el iframe en Human pasando `?instance={{ user.id }}`.

---

Cualquier edición a los checklists (modo inline): editar `data.js`, redeploy, listo.
