/**
 * app.js
 * -------
 * Lógica principal de la app Dino Talento (Programa Formaciones · Grupo Dinosaurio).
 *
 * Persistencia: sessionStorage (se borra al cerrar la pestaña).
 * Cada pestaña = su propio expediente. Dos pestañas simultáneas del mismo puesto
 * = dos colaboradores distintos, estados independientes.
 * Al cerrar la pestaña se borra todo → la próxima apertura arranca limpia.
 * El refresh del tab mantiene el estado (sessionStorage sobrevive al F5).
 *
 * Estructura:
 *   dino:v3:<tabId>:meta    → { [stageId]: { entrenador, legajo_entrenador, ... } }
 *   dino:v3:<tabId>:tasks   → { [stageId]: { [taskId]: { fecha, estado, comentario } } }
 *   dino:v3:<tabId>:ui      → { currentStage }
 *
 * Resolución del tabId:
 *   Se genera un UUID al primer load y se guarda en sessionStorage bajo
 *   "dino:v3:tab-id". Cada pestaña tiene su propio UUID, aislado del resto.
 */

(() => {
  "use strict";

  const STORAGE_PREFIX = "dino:v3";
  const TAB_ID_KEY = `${STORAGE_PREFIX}:tab-id`;
  const ESTADOS = ["", "Pendiente", "En proceso", "Finalizado"];

  // ---------- URL params ----------
  // ?stage=<id> → fija un único checklist (modo "un iframe por puesto").
  const urlParams = new URLSearchParams(window.location.search);

  // ---------- Instance (por pestaña) ----------
  // UUID generado una vez por pestaña. Vive en sessionStorage.
  // Nuevo tab → nuevo UUID → storage vacío.
  // Refresh del mismo tab → se mantiene el UUID → se mantiene el estado.
  // Cierre del tab → sessionStorage se borra → se pierde todo.
  function getOrCreateTabId() {
    try {
      let id = sessionStorage.getItem(TAB_ID_KEY);
      if (!id) {
        id = crypto.randomUUID().slice(0, 8);
        sessionStorage.setItem(TAB_ID_KEY, id);
      }
      return id;
    } catch {
      // sessionStorage bloqueado (incógnito estricto, etc.): UUID volátil en memoria.
      return crypto.randomUUID().slice(0, 8);
    }
  }
  const instanceId = getOrCreateTabId();
  const lockedStageId = urlParams.get("stage") || null; // si viene, la app queda fijada a ese puesto
  const KEYS = {
    meta: `${STORAGE_PREFIX}:${instanceId}:meta`,
    tasks: `${STORAGE_PREFIX}:${instanceId}:tasks`,
    ui: `${STORAGE_PREFIX}:${instanceId}:ui`,
  };

  // ---------- Storage ----------
  function readJSON(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn("[Dino Talento] No se pudo persistir:", err);
    }
  }

  // ---------- Warning al cerrar con datos sin exportar ----------
  let hasUnsavedData = false;
  function markDirty() { hasUnsavedData = true; }
  function markExported() { hasUnsavedData = false; }
  window.addEventListener("beforeunload", (e) => {
    if (hasUnsavedData) {
      e.preventDefault();
      e.returnValue = "Tenés datos sin exportar. ¿Seguro que querés cerrar?";
      return e.returnValue;
    }
  });

  // ---------- State ----------
  const state = {
    stages: [],
    currentStageId: null,
    meta: readJSON(KEYS.meta, {}),
    tasks: readJSON(KEYS.tasks, {}),
    ui: readJSON(KEYS.ui, { currentStage: null }),
  };

  // ---------- Elements ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    stageNav: $("#stage-nav"),
    stageTitle: $("#stage-title"),
    stageForm: $("#stage-form"),
    taskTable: $("#task-table"),
    stageBar: $("#stage-progress-bar"),
    stageText: $("#stage-progress-text"),
    stageDetail: $("#stage-progress-detail"),
    instanceId: $("#instance-id"),
    resetBtn: $("#reset-btn"),
    exportXlsx: $("#export-xlsx"),
    exportPdf: $("#export-pdf"),
    exportCsv: $("#export-csv"),
    toast: $("#toast"),
    modal: $("#modal"),
    modalCancel: $("#modal-cancel"),
    modalConfirm: $("#modal-confirm"),
  };

  // ---------- Utils ----------
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2000);
  }
  function openModal({ title, body, onConfirm }) {
    $("#modal-title").textContent = title;
    $("#modal-body").textContent = body;
    els.modal.classList.add("open");
    els.modal.setAttribute("aria-hidden", "false");
    els.modalConfirm.onclick = () => {
      closeModal();
      onConfirm?.();
    };
  }
  function closeModal() {
    els.modal.classList.remove("open");
    els.modal.setAttribute("aria-hidden", "true");
  }
  els.modalCancel.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (e) => { if (e.target === els.modal) closeModal(); });

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function flattenTasks(stage) {
    const out = [];
    stage.groups.forEach((g) => g.tasks.forEach((t) => out.push(t)));
    return out;
  }

  function stageTotals(stage) {
    const all = flattenTasks(stage);
    const data = state.tasks[stage.id] || {};
    const done = all.filter((t) => data[t.id]?.estado === "Finalizado").length;
    return { total: all.length, done, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
  }

  // ---------- Render: sidebar ----------
  function renderSidebar() {
    els.stageNav.innerHTML = "";
    state.stages.forEach((stage) => {
      const { done, total, pct } = stageTotals(stage);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `stage-nav-item ${state.currentStageId === stage.id ? "active" : ""}`;
      btn.innerHTML = `
        <div class="top-row">
          <span>${escapeHtml(stage.name)}</span>
          <span class="badge">${done}/${total}</span>
        </div>
        <div class="mini-progress"><div class="mini-progress-bar" style="width:${pct}%"></div></div>
      `;
      btn.addEventListener("click", () => setCurrentStage(stage.id));
      els.stageNav.appendChild(btn);
    });
    els.instanceId.textContent = instanceId;
  }

  // ---------- Render: form (cabecera) ----------
  function renderForm(stage) {
    const meta = state.meta[stage.id] || {};
    els.stageForm.querySelectorAll("[data-meta]").forEach((el) => {
      const key = el.dataset.meta;
      if (key === "puesto") {
        el.value = stage.name;
      } else {
        el.value = meta[key] ?? "";
      }
    });
  }

  // ---------- Render: progress ----------
  function renderStageProgress(stage) {
    const { done, total, pct } = stageTotals(stage);
    els.stageBar.style.width = `${pct}%`;
    els.stageText.textContent = `${pct}%`;
    els.stageDetail.textContent = `${done} / ${total} tareas finalizadas`;
  }

  // ---------- Render: task table ----------
  function renderTaskTable(stage) {
    const tasks = flattenTasks(stage);
    const data = state.tasks[stage.id] || {};

    const header = `
      <div class="th">Guía de tareas</div>
      <div class="th">Fecha del encuentro</div>
      <div class="th">Estado de avance</div>
      <div class="th">Comentarios</div>
    `;

    const rows = tasks.map((task, i) => {
      const t = data[task.id] || {};
      const estado = t.estado || "";
      const fecha = t.fecha || "";
      const comentario = t.comentario || "";
      return `
        <div class="task-row" data-task-id="${escapeHtml(task.id)}" data-status="${escapeHtml(estado)}" style="display:contents">
          <div class="cell-task">
            <span class="index">${i + 1}.</span>
            <span class="title">${escapeHtml(task.title)}</span>
          </div>
          <div class="cell-date">
            <input type="date" data-field="fecha" value="${escapeHtml(fecha)}" />
          </div>
          <div class="cell-status">
            <select data-field="estado">
              ${ESTADOS.map((e) => `<option value="${escapeHtml(e)}" ${e === estado ? "selected" : ""}>${e || "—"}</option>`).join("")}
            </select>
          </div>
          <div class="cell-comment">
            <textarea data-field="comentario" rows="1" placeholder="Comentarios…">${escapeHtml(comentario)}</textarea>
          </div>
        </div>
      `;
    }).join("");

    els.taskTable.innerHTML = header + rows;

    // Wire inputs
    els.taskTable.querySelectorAll(".task-row").forEach((row) => {
      const taskId = row.dataset.taskId;
      row.querySelectorAll("[data-field]").forEach((input) => {
        const field = input.dataset.field;
        const handler = () => updateTaskField(stage.id, taskId, field, input.value, row);
        input.addEventListener("change", handler);
        if (input.tagName === "TEXTAREA") input.addEventListener("input", debounce(handler, 300));
      });
    });
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function updateTaskField(stageId, taskId, field, value, rowEl) {
    state.tasks[stageId] = state.tasks[stageId] || {};
    state.tasks[stageId][taskId] = state.tasks[stageId][taskId] || {};
    state.tasks[stageId][taskId][field] = value;
    writeJSON(KEYS.tasks, state.tasks);
    markDirty();

    if (field === "estado") {
      rowEl.dataset.status = value;
      // Re-render progress + sidebar
      const stage = state.stages.find((s) => s.id === stageId);
      renderStageProgress(stage);
      renderSidebar();
    }
  }

  function setCurrentStage(stageId) {
    state.currentStageId = stageId;
    state.ui.currentStage = stageId;
    writeJSON(KEYS.ui, state.ui);
    renderSidebar();
    const stage = state.stages.find((s) => s.id === stageId);
    if (!stage) return;
    els.stageTitle.textContent = stage.name;
    renderForm(stage);
    renderStageProgress(stage);
    renderTaskTable(stage);
  }

  // ---------- Form wiring (cabecera) ----------
  els.stageForm.addEventListener("input", (e) => {
    const el = e.target.closest("[data-meta]");
    if (!el) return;
    const key = el.dataset.meta;
    if (key === "puesto") return; // readonly, vinculado al stage
    state.meta[state.currentStageId] = state.meta[state.currentStageId] || {};
    state.meta[state.currentStageId][key] = el.value;
    // Store puesto too for exports
    state.meta[state.currentStageId].puesto =
      state.stages.find((s) => s.id === state.currentStageId)?.name || "";
    debouncedSaveMeta();
  });
  const debouncedSaveMeta = debounce(() => {
    writeJSON(KEYS.meta, state.meta);
    markDirty();
  }, 250);

  // ---------- Reset ----------
  els.resetBtn.addEventListener("click", () => {
    openModal({
      title: "¿Reiniciar instancia?",
      body: `Se borran todos los datos de esta instancia (${instanceId}): campos del entrenamiento, fechas, estados, comentarios y observaciones. No se puede deshacer.`,
      onConfirm: () => {
        state.meta = {};
        state.tasks = {};
        writeJSON(KEYS.meta, state.meta);
        writeJSON(KEYS.tasks, state.tasks);
        const stage = state.stages.find((s) => s.id === state.currentStageId);
        renderSidebar();
        if (stage) {
          renderForm(stage);
          renderStageProgress(stage);
          renderTaskTable(stage);
        }
        showToast("Instancia reiniciada");
      },
    });
  });

  // ---------- Exports ----------
  function buildStageRows(stage) {
    const tasks = flattenTasks(stage);
    const data = state.tasks[stage.id] || {};
    return tasks.map((t, i) => {
      const d = data[t.id] || {};
      return {
        "#": i + 1,
        Puesto: stage.name,
        Tarea: t.title,
        "Fecha del encuentro": d.fecha || "",
        "Estado de avance": d.estado || "",
        Comentarios: d.comentario || "",
      };
    });
  }

  function exportToCSV() {
    const rows = state.stages.flatMap(buildStageRows);
    const csv = Papa.unparse(rows);
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename("csv"));
    markExported();
    showToast("CSV descargado");
  }

  function exportToXLSX() {
    const wb = XLSX.utils.book_new();
    state.stages.forEach((stage) => {
      const meta = state.meta[stage.id] || {};
      // Cabecera tipo modelo + tabla de tareas
      const aoa = [
        ["Dino Talento"],
        ['PROGRAMA FORMACIONES'],
        ['"Tu Desarrollo en Grupo Dinosaurio"'],
        [],
        ["Apellido y Nombre del entrenador:", meta.entrenador || ""],
        ["Nº de Legajo:", meta.legajo_entrenador || ""],
        ["Apellido y Nombre del colaborador entrenado:", meta.colaborador || ""],
        ["Nº de Legajo:", meta.legajo_colaborador || ""],
        ["Fecha de Inicio del entrenamiento:", meta.fecha_inicio || ""],
        ["Fecha de Fin del entrenamiento:", meta.fecha_fin || ""],
        ["Puesto en el que se entrenó:", stage.name],
        ["Resultado:", meta.resultado || ""],
        ["Observaciones:", meta.observaciones || ""],
        [],
        ["Guía de tareas", "Fecha del encuentro", "Estado de avance", "Comentarios"],
      ];
      flattenTasks(stage).forEach((t) => {
        const d = (state.tasks[stage.id] || {})[t.id] || {};
        aoa.push([t.title, d.fecha || "", d.estado || "", d.comentario || ""]);
      });
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [{ wch: 60 }, { wch: 18 }, { wch: 18 }, { wch: 40 }];
      const safeName = stage.name.replace(/[\\\/\*\?\:\[\]]/g, "").slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    });
    XLSX.writeFile(wb, filename("xlsx"));
    markExported();
    showToast("Excel descargado");
  }

  function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;

    state.stages.forEach((stage, idx) => {
      if (idx > 0) doc.addPage();
      let y = 48;
      const meta = state.meta[stage.id] || {};

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Dino Talento", marginX, y);
      y += 16;
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text('PROGRAMA FORMACIONES — "Tu Desarrollo en Grupo Dinosaurio"', marginX, y);
      y += 18;
      doc.setTextColor(0);

      // Meta como minitable
      const metaBody = [
        ["Entrenador", meta.entrenador || "", "Nº Legajo", meta.legajo_entrenador || ""],
        ["Colaborador entrenado", meta.colaborador || "", "Nº Legajo", meta.legajo_colaborador || ""],
        ["Fecha inicio", meta.fecha_inicio || "", "Fecha fin", meta.fecha_fin || ""],
        ["Puesto", stage.name, "Resultado", meta.resultado || ""],
      ];
      doc.autoTable({
        startY: y,
        margin: { left: marginX, right: marginX },
        body: metaBody,
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [241, 243, 249], cellWidth: 110 },
          2: { fontStyle: "bold", fillColor: [241, 243, 249], cellWidth: 80 },
        },
        theme: "grid",
      });
      y = doc.lastAutoTable.finalY + 6;

      if (meta.observaciones) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Observaciones:", marginX, y + 12);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(meta.observaciones, 515);
        doc.text(wrapped, marginX, y + 26);
        y += 26 + wrapped.length * 12;
      }

      // Tabla de tareas
      const body = flattenTasks(stage).map((t, i) => {
        const d = (state.tasks[stage.id] || {})[t.id] || {};
        return [i + 1, t.title, d.fecha || "", d.estado || "", d.comentario || ""];
      });
      doc.autoTable({
        startY: y + 8,
        margin: { left: marginX, right: marginX },
        head: [["#", "Guía de tareas", "Fecha", "Estado", "Comentarios"]],
        body,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [46, 125, 50], textColor: 255 },
        alternateRowStyles: { fillColor: [246, 247, 251] },
        columnStyles: {
          0: { cellWidth: 24, halign: "center" },
          2: { cellWidth: 70 },
          3: { cellWidth: 70 },
          4: { cellWidth: 140 },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 3) {
            const v = data.cell.raw;
            if (v === "Finalizado") data.cell.styles.textColor = [22, 120, 60];
            else if (v === "En proceso") data.cell.styles.textColor = [180, 110, 10];
            else if (v === "Pendiente") data.cell.styles.textColor = [90, 90, 90];
          }
        },
      });
    });

    doc.save(filename("pdf"));
    markExported();
    showToast("PDF descargado");
  }

  els.exportXlsx.addEventListener("click", exportToXLSX);
  els.exportCsv.addEventListener("click", exportToCSV);
  els.exportPdf.addEventListener("click", exportToPDF);

  function filename(ext) {
    const stamp = new Date().toISOString().slice(0, 10);
    return `dino-talento-${instanceId}-${stamp}.${ext}`;
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Boot ----------
  async function boot() {
    els.taskTable.innerHTML = `
      <div class="th">Guía de tareas</div>
      <div class="th">Fecha del encuentro</div>
      <div class="th">Estado de avance</div>
      <div class="th">Comentarios</div>
      <div class="cell-task"><div class="skeleton" style="width:70%"></div></div>
      <div class="cell-date"><div class="skeleton" style="width:60%"></div></div>
      <div class="cell-status"><div class="skeleton" style="width:60%"></div></div>
      <div class="cell-comment"><div class="skeleton" style="width:80%"></div></div>
    `;
    try {
      const allStages = await window.DineoData.loadStages();

      // Modo "single" si viene ?stage=<id>: la app queda fijada a ese checklist.
      if (lockedStageId) {
        const locked = allStages.find((s) => s.id === lockedStageId);
        if (!locked) {
          els.taskTable.innerHTML = `<div class="empty" style="grid-column:1/-1">
            El checklist "${escapeHtml(lockedStageId)}" no existe. IDs válidos:
            <br><br>${allStages.map((s) => `<code>${escapeHtml(s.id)}</code>`).join(" · ")}
          </div>`;
          return;
        }
        state.stages = [locked];
        document.body.classList.add("single-stage");
      } else {
        state.stages = allStages;
      }

      const preferred = state.ui.currentStage;
      const initial =
        lockedStageId ||
        (preferred && state.stages.some((s) => s.id === preferred) && preferred) ||
        (state.stages[0]?.id ?? null);
      setCurrentStage(initial);
    } catch (err) {
      console.error(err);
      els.taskTable.innerHTML = `<div class="empty" style="grid-column:1/-1">Error cargando los datos. Revisá la consola.</div>`;
    }
  }

  boot();
})();
