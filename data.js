/**
 * data.js
 * --------
 * Fuente de datos del programa "Dino Talento" (Grupo Dinosaurio).
 *
 * Contiene los 6 checklists reales extraídos del archivo MODELO:
 *   02. MODELO Check list tareas · Programa Formaciones (Guía para mentores).xlsx
 *
 * Cada etapa corresponde a una hoja del Excel original y representa un puesto
 * dentro del programa de formación.
 *
 * Si en el futuro querés que los checklists se alimenten desde un Google Sheet
 * en vivo (para editarlos sin redeploy), mirá la sección "Sheet loader" al final.
 */

const DATA_SOURCE = "inline"; // "inline" | "sheet"

const SHEET_CONFIG = {
  sheetId: "1G7uGkz4C6NXLJlh9bH2Es-6PTJl9VokR",
  // Completar con los gid reales de cada hoja si querés usar DATA_SOURCE = "sheet".
  stages: [
    // { id: "referente-venta-mayorista", name: "Referente Venta Mayorista", gid: "311259899" },
    // { id: "asistente-mall",             name: "Asistente Mall",             gid: "..." },
    // { id: "recepcionista-devoluciones", name: "Recepcionista Devoluciones", gid: "..." },
    // { id: "asistente-de-precios",       name: "Asistente de Precios",       gid: "..." },
    // { id: "asistente-stock",            name: "Asistente Stock",            gid: "..." },
    // { id: "asistente-inventario",       name: "Asistente Inventario",       gid: "..." },
  ],
};

/* ==========================================================================
   Datos inline · Extraídos del Excel original
   ========================================================================== */

const INLINE_STAGES = [
  {
    "id": "referente-venta-mayorista",
    "name": "Referente Venta Mayorista",
    "subtitle": "Guía de tareas para la formación de Referente Venta Mayorista.",
    "groups": [
      {
        "name": "Guía de tareas",
        "tasks": [
          {
            "id": "asesorar-sobre-ventas-mayoristas",
            "title": "Asesorar sobre ventas mayoristas."
          },
          {
            "id": "captar-nuevos-clientes-club-mami-tanto-en-la-sucur",
            "title": "Captar nuevos Clientes Club Mami, tanto en la sucursal como alrededores."
          },
          {
            "id": "realizar-difusion-de-promociones-y-ofertas-segun-s",
            "title": "Realizar difusión de promociones y ofertas, según segmentación de Clientes."
          },
          {
            "id": "realizar-comparativas-de-precios",
            "title": "Realizar comparativas de precios."
          },
          {
            "id": "gestionar-el-circuito-de-ventas-diferidas-presupue",
            "title": "Gestionar el circuito de ventas diferidas (presupuesto, armado de pedido, acompañamiento, firma de planillas,corroborar pago y plazos, almacenamiento, entrega de mercadería al Cliente)."
          },
          {
            "id": "gestionar-con-el-area-de-facturacion-y-tesoreria-l",
            "title": "Gestionar con el Área de Facturación y Tesoreria la facturación pedidos en cta. Cte. Y realizar seguimiento."
          },
          {
            "id": "mantener-comunicacion-fluida-con-el-area-comercial",
            "title": "Mantener comunicación fluida con el Área Comercial sobre las necesidades de los Clientes en cuanto a promociones y surtido."
          },
          {
            "id": "mantener-comunicacion-fluida-con-el-gerente-sector",
            "title": "Mantener comunicación fluida con el Gerente Sector y Área Comercial en cuanto al stock y vencimiento para solicitar acciones comerciales."
          },
          {
            "id": "colaboracion-con-la-reposicion-en-gondola",
            "title": "Colaboración con la reposición en góndola."
          },
          {
            "id": "asesorar-a-los-clientes-en-cuento-a-las-ventajas-y",
            "title": "Asesorar a los Clientes en cuento a las ventajas y uso de la APP."
          },
          {
            "id": "comunicar-al-referente-de-banco-dino-cualquier-nov",
            "title": "Comunicar al Referente de Banco Dino cualquier novedad o inconveniente relacionado con la APP."
          },
          {
            "id": "realizar-reparto-de-mercaderia-a-la-municipalidad-",
            "title": "Realizar reparto de mercadería a la Municipalidad de Jesús Maria, Colonia Caroya y Sinsacate (Suc. COC)."
          }
        ]
      }
    ]
  },
  {
    "id": "asistente-mall",
    "name": "Asistente Mall",
    "subtitle": "Guía de tareas para la formación de Asistente Mall.",
    "groups": [
      {
        "name": "Guía de tareas",
        "tasks": [
          {
            "id": "confeccionar-informe-de-indicadores-operativos-sem",
            "title": "Confeccionar informe de indicadores operativos (semanal y mensual)."
          },
          {
            "id": "descargar-y-confeccionar-planillas-relacionadas-al",
            "title": "Descargar y confeccionar Planillas relacionadas al Tablero de Operaciones."
          },
          {
            "id": "descargar-movimientos-por-transformacion-merma-con",
            "title": "Descargar movimientos por transformación, merma, consumo interno,etc)."
          },
          {
            "id": "presenciar-merma-de-verduleria-y-realizar-analisis",
            "title": "Presenciar merma de verdulería y realizar análisis."
          },
          {
            "id": "entrega-y-seguimiento-de-talonarios-de-movimientos",
            "title": "Entrega y seguimiento de talonarios de movimientos."
          },
          {
            "id": "informar-al-area-comercial-codigos-inexistentes-nu",
            "title": "Informar al Área Comercial códigos inexistentes, nuevas presentaciones, productos próximos a vencer, etc."
          },
          {
            "id": "compartir-informacion-o-comunicados-importantes-a-",
            "title": "Compartir información o comunicados importantes a los Gerentes/Jefes."
          },
          {
            "id": "informar-a-asistente-de-stock-que-se-encuentra-car",
            "title": "Informar a asistente de stock que se encuentra cargada la planilla de SSVTA."
          },
          {
            "id": "proporcionar-reportes-al-personal-interno-o-extern",
            "title": "Proporcionar reportes al personal interno o externo según necesidad (stock, ventas, horas de trabajo, etc.)"
          },
          {
            "id": "realizar-seguimiento-de-cronograma-de-conteos-app-",
            "title": "Realizar seguimiento de cronograma de conteos (App inventarios)."
          },
          {
            "id": "colaborar-con-auditoria-en-el-analisis-de-inventar",
            "title": "Colaborar con Auditoria en el análisis de inventario o seguimientos de códigos según requerimiento."
          },
          {
            "id": "entregar-colectora-descargar-datos-y-enviar-a-audi",
            "title": "Entregar colectora, descargar datos y enviar a Auditoria."
          },
          {
            "id": "realizar-impresion-de-planillas-para-conteos-plani",
            "title": "Realizar impresión de planillas para conteos planificados (a modo informativo)."
          },
          {
            "id": "notificar-a-auditoria-los-conteos-y-reconteos-real",
            "title": "Notificar a Auditoria los conteos y reconteos realizados."
          },
          {
            "id": "solicitar-por-sgt-pedidos-de-insumos-cotidianos",
            "title": "Solicitar por SGT pedidos de insumos cotidianos."
          },
          {
            "id": "confeccion-y-descarga-de-control-aleatorio-de-cron",
            "title": "Confección y descarga de control aleatorio de cronograma de limpieza."
          },
          {
            "id": "envio-de-cronograma-de-limpieza-a-gerentesjefes",
            "title": "Envío de cronograma de limpieza a Gerentes/Jefes."
          },
          {
            "id": "colaborar-con-las-funciones-del-asistente-stock-cu",
            "title": "Colaborar con las funciones del Asistente Stock cuando el Gerente Mall lo considere necesario."
          },
          {
            "id": "colaborar-con-el-sector-bromatologia-cargar-datos-",
            "title": "Colaborar con el sector Bromatología cargar datos en etiquetas de la balanza de la sucursal."
          }
        ]
      }
    ]
  },
  {
    "id": "recepcionista-devoluciones",
    "name": "Recepcionista Devoluciones",
    "subtitle": "Guía de tareas para la formación de Recepcionista Devoluciones.",
    "groups": [
      {
        "name": "Guía de tareas",
        "tasks": [
          {
            "id": "gestionar-los-distintos-movimientos-de-mercaderia-",
            "title": "Gestionar los distintos movimientos de mercadería realizando el egreso o ingreso correspondiente."
          },
          {
            "id": "trasladar-la-mercaderia-a-devolver-o-transferir-ha",
            "title": "Trasladar la mercadería a devolver o transferir, hasta la cortina de recepción."
          },
          {
            "id": "decomisar-la-mercaderia-para-mermar",
            "title": "Decomisar la mercadería para mermar"
          },
          {
            "id": "en-el-caso-de-recupero-de-mercaderia-con-acuerdo-c",
            "title": "En el caso de recupero de mercadería con Acuerdo Comercial relacionar el Acuerdo a movimiento por merma."
          },
          {
            "id": "mantener-comunicacion-fluida-con-el-comprador-a-lo",
            "title": "Mantener comunicación fluida con el Comprador a los fines de gestionar los distintos movimientos de mercadería (solicitudes, acuerdos comerciales, Notas de crédito, etc.)."
          },
          {
            "id": "alertar-a-los-compradores-sobre-mercaderia-en-mal-",
            "title": "Alertar a los compradores sobre mercadería en mal estado, fallas de fabricación o presentación, etc."
          },
          {
            "id": "solicitar-la-presencia-del-gtejefe-a-los-fines-de-",
            "title": "Solicitar la presencia del Gte./Jefe a los fines de autorizar los movimientos."
          },
          {
            "id": "informar-la-merma-por-roboconsumo-al-gerentejefe-s",
            "title": "Informar la merma por robo/consumo al Gerente/Jefe Sector y Jefe Seguridad."
          },
          {
            "id": "informar-al-superior-inmediato-y-comprador-cualqui",
            "title": "Informar al superior inmediato y Comprador cualquier impedimento para gestionar los distintos movimientos."
          },
          {
            "id": "coordinar-con-el-sector-de-logistica-el-envio-de-t",
            "title": "Coordinar con el Sector de Logística el envío de transferencias."
          },
          {
            "id": "mantener-comunicacion-con-los-proveedores-y-transp",
            "title": "Mantener comunicación con los proveedores y transportistas para autorizar movimientos (decomisos o devoluciones)."
          },
          {
            "id": "mantener-el-orden-y-limpieza-del-puesto-de-trabajo",
            "title": "Mantener el orden y limpieza del puesto de trabajo (depósito, racks)."
          },
          {
            "id": "separar-clasificar-e-identificar-la-mercaderia-der",
            "title": "Separar, clasificar e identificar la mercadería derivada al sector según el destino de la misma (merma, transferencia, transformación, devolución), por sector y por proveedor."
          },
          {
            "id": "colaborar-con-la-recepcion-de-mercaderia-del-prove",
            "title": "Colaborar con la recepción de mercadería del proveedor."
          },
          {
            "id": "colaborar-con-el-manejo-de-autoelevadores-siempre-",
            "title": "Colaborar con el manejo de autoelevadores (siempre que posea carnet habilitante)."
          }
        ]
      }
    ]
  },
  {
    "id": "asistente-de-precios",
    "name": "Asistente de Precios",
    "subtitle": "Guía de tareas para la formación de Asistente de Precios.",
    "groups": [
      {
        "name": "Guía de tareas",
        "tasks": [
          {
            "id": "emitir-y-verificar-el-reporte-listado-de-cambio-de",
            "title": "Emitir y verificar el Reporte “Listado de cambio de precios”"
          },
          {
            "id": "imprimir-las-plantillas-de-cambio-de-precio-regula",
            "title": "Imprimir las plantillas de cambio de precio regular, mayorista, bulto cerrado y ofertas, cortar y separar por Sector."
          },
          {
            "id": "extraer-de-los-flejes-gondolas-etiquetas-g1-islas-",
            "title": "Extraer de los flejes, góndolas, etiquetas, G1, Islas, Punteras, exhibidores y heladeras los precios y promociones caducadas."
          },
          {
            "id": "colocar-la-etiqueta-de-precio-vigente-y-en-el-caso",
            "title": "Colocar la etiqueta de precio vigente y en el caso de ser necesario utilizar flechas según política."
          },
          {
            "id": "textil-y-deco-imprimir-de-cambio-de-precio-y-etiqu",
            "title": "Textil y Deco: imprimir de cambio de precio y etiquetas Dynapos (AV/R20)."
          },
          {
            "id": "durante-el-dia-realizar-recorrido-en-el-salon-corr",
            "title": "Durante el día realizar recorrido en el salón corroborando que todos los productos posean su correspondiente precio, flecha o promoción vigente."
          },
          {
            "id": "controlar-el-folleto-impreso-el-dia-previo-a-la-pu",
            "title": "Controlar el folleto impreso el día previo a la publicación."
          },
          {
            "id": "emitir-reporte-de-promociones",
            "title": "Emitir reporte de promociones."
          },
          {
            "id": "confeccionar-e-imprimir-la-carteleria-teniendo-en-",
            "title": "Confeccionar e imprimir la cartelería teniendo en cuenta el tamaño y ubicación de la exhibición."
          },
          {
            "id": "mantener-comunicacion-con-el-area-comercial-en-rel",
            "title": "Mantener comunicación con el Área comercial en relación códigos inexistentes, códigos con doble presentación, error unidad de medida, diferencias de precio, promociones, etc."
          },
          {
            "id": "colaboracion-con-el-soporte-de-carteleria-general",
            "title": "Colaboracion con el Soporte de cartelería general."
          },
          {
            "id": "colaboracion-con-el-armado-y-colocacion-de-banners",
            "title": "Colaboración con el armado y colocación de banners y lonas aéreas para promociones especiales y cartelería general del mall."
          },
          {
            "id": "colaboracion-con-reposicion-de-productos-en-gondol",
            "title": "Colaboración con reposición de productos en góndola."
          }
        ]
      }
    ]
  },
  {
    "id": "asistente-stock",
    "name": "Asistente Stock",
    "subtitle": "Guía de tareas para la formación de Asistente Stock.",
    "groups": [
      {
        "name": "Guía de tareas",
        "tasks": [
          {
            "id": "verificar-que-los-productos-ingresados-en-el-dia-o",
            "title": "Verificar que los productos ingresados en el día o el día anterior se encuentren exhibidos en el salón."
          },
          {
            "id": "verificar-que-los-productos-que-figuran-sin-venta-",
            "title": "Verificar que los productos que figuran sin venta por Rubro se encuentren exhibidos."
          },
          {
            "id": "en-el-caso-de-que-no-se-encuentren-exhibidos-rastr",
            "title": "En el caso de que no se encuentren exhibidos rastrear el producto e informar al Gerente/Jefe para que asigne un Colaborador que realice la reposición."
          },
          {
            "id": "identificar-y-registrar-en-la-planilla-de-control-",
            "title": "Identificar y registrar en la Planilla de control, los códigos de los productos que poseen nueva presentación para que el Gerente pueda informar al Área comercial y se realice la unificación de precios correspondiente."
          },
          {
            "id": "analizar-posibles-quiebres-o-sobre-stock-junto-al-",
            "title": "Analizar posibles quiebres o sobre stock junto al Gerente Mall."
          },
          {
            "id": "analizar-productos-proximos-a-vencer-junto-al-gere",
            "title": "Analizar productos próximos a vencer junto al Gerente Mall."
          },
          {
            "id": "realizar-control-de-vencimientos-segun-cronograma",
            "title": "Realizar control de vencimientos según cronograma."
          },
          {
            "id": "realizar-un-control-aleatorio-del-cambio-de-precio",
            "title": "Realizar un control aleatorio del cambio de precio diario."
          },
          {
            "id": "durante-el-recorrido-en-el-salon-verificar-detecta",
            "title": "Durante el recorrido en el salón verificar detectar e informar cualquier irregularidad, productos vencidos, productos sin precio o con precio incorrecto, góndolas o heladeras en mal estado o vacías, productos sin alarma, etc."
          }
        ]
      }
    ]
  },
  {
    "id": "asistente-inventario",
    "name": "Asistente Inventario",
    "subtitle": "Guía de tareas para la formación de Asistente Inventario.",
    "groups": [
      {
        "name": "Guía de tareas",
        "tasks": [
          {
            "id": "identificar-los-codigos-a-contar-preparar-y-delimi",
            "title": "Identificar los códigos a contar, preparar y delimitar el área de conteo (góndolas, aéreos, depósito, devoluciones, pallets)"
          },
          {
            "id": "desarmar-y-armar-pallet-cuando-el-mismo-posee-dist",
            "title": "Desarmar y armar pallet cuando el mismo posee distintos codigos de productos a contar."
          },
          {
            "id": "solicitar-colectora-y-al-finalizar-el-conteo-devol",
            "title": "Solicitar colectora y al finalizar el conteo devolver con el registro correspondiente."
          },
          {
            "id": "segun-cronograma-de-conteo-y-plazos-establecidos-e",
            "title": "Segun cronograma de conteo y plazos establecidos ejecutar el conteo fisico de productos teniendo en cuenta la totalidad de los productos que pertenezcan al parámetro establecido (Rubro, Sector, UEN, Proveedor o productos hipersensibles)."
          },
          {
            "id": "realizar-reconteos-de-codigos-en-el-caso-de-difere",
            "title": "Realizar reconteos de codigos en el caso de diferencias de inventario o por requerimiento."
          },
          {
            "id": "informar-al-superior-inmediato-novedades-resultado",
            "title": "Informar al Superior Inmediato, novedades, resultados o problemáticas de los conteos o reconteos."
          }
        ]
      }
    ]
  }
];

/* ==========================================================================
   Sheet loader opcional (CSV publicado)
   ==========================================================================
   Para alimentar la app desde un Google Sheet en vivo:
   1. Archivo → Compartir → Publicar en la web → CSV → documento completo.
   2. Completar SHEET_CONFIG.stages con los gid de cada hoja.
   3. Cambiar DATA_SOURCE a "sheet".
   Columnas aceptadas en cada hoja (tolerantes a ES/EN):
     Tarea (obligatorio), Descripción, Grupo, Responsable, Plazo.
*/

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function normalizeRow(row, index) {
  const get = (keys) => {
    for (const k of keys) {
      const v = row[k] ?? row[k?.toLowerCase()] ?? row[k?.toUpperCase()];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };
  const title = get(["Tarea", "Task", "Título", "Titulo", "Guía de tareas"]);
  if (!title) return null;
  const description = get(["Descripción", "Descripcion", "Description", "Detalle"]);
  const group = get(["Grupo", "Group", "Sección", "Seccion", "Categoría"]);
  const owner = get(["Responsable", "Owner"]);
  const due = get(["Plazo", "Due", "Fecha"]);
  return {
    id: slugify(`${group}-${title}`) || `task-${index}`,
    title,
    description,
    owner,
    due,
    _group: group || "Guía de tareas",
  };
}

async function fetchStageFromSheet(stage) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.sheetId}/export?format=csv&gid=${stage.gid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo leer la hoja "${stage.name}" (${res.status})`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const tasks = (parsed.data || []).map((row, i) => normalizeRow(row, i)).filter(Boolean);

  const groupMap = new Map();
  tasks.forEach((t) => {
    const g = t._group || "Guía de tareas";
    if (!groupMap.has(g)) groupMap.set(g, []);
    const { _group, ...clean } = t;
    groupMap.get(g).push(clean);
  });
  const groups = [...groupMap.entries()].map(([name, tasks]) => ({ name, tasks }));

  return {
    id: stage.id,
    name: stage.name,
    subtitle: stage.subtitle || "",
    groups,
  };
}

async function loadStages() {
  if (DATA_SOURCE === "sheet" && SHEET_CONFIG.stages.length > 0) {
    try {
      const stages = await Promise.all(SHEET_CONFIG.stages.map(fetchStageFromSheet));
      const ok = stages.filter((s) => s.groups.some((g) => g.tasks.length > 0));
      if (ok.length) return ok;
    } catch (err) {
      console.error("[Dino Talento] Error cargando desde Sheet, se usan datos inline:", err);
    }
  }
  return INLINE_STAGES;
}

window.DineoData = { loadStages, INLINE_STAGES };
