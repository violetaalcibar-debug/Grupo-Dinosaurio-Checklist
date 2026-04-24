/**
 * app.js — Dino Talento (Programa Formaciones · Grupo Dinosaurio)
 *
 * Persistencia: Supabase (tabla checklists).
 * Cada fila = un expediente de un colaborador en un puesto.
 * El picker lista todos los expedientes del puesto activo.
 * Autosave con debounce de 500 ms en cada cambio.
 */

(() => {
  "use strict";

  // ---------- Credenciales ----------
  const cfg = window.DineoConfig || {};
  const SUPABASE_URL = (cfg.SUPABASE_URL || "").trim();
  const SUPABASE_ANON_KEY = (cfg.SUPABASE_ANON_KEY || "").trim();
  const credsMissing =
    !SUPABASE_URL ||
    SUPABASE_URL.includes("TU-PROJECT") ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY === "eyJ..." ||
    SUPABASE_ANON_KEY.length < 20;

  // ---------- Constantes ----------
  const ESTADOS = ["", "Pendiente", "En proceso", "Finalizado"];
  const urlParams = new URLSearchParams(window.location.search);
  const lockedStageId   = urlParams.get("stage") || null;
  const resumeChecklist = urlParams.get("checklist") || null;

  function pushState(stageId, checklistId) {
    const p = new URLSearchParams(window.location.search);
    if (stageId)     p.set("stage",     stageId);
    if (checklistId) p.set("checklist", checklistId);
    else             p.delete("checklist");
    history.replaceState(null, "", "?" + p.toString());
  }

  // ---------- Supabase client ----------
  let db = null;
  if (!credsMissing) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // ---------- State ----------
  const state = {
    stages: [],
    currentStageId: null,
    mode: "picker",           // "picker" | "form"
    currentChecklistId: null, // UUID de la fila activa en DB
    currentChecklist: null,   // { meta, tasks }
    pickerItems: [],          // lista cargada del picker actual
  };

  // ---------- Elements ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    stageNav:      $("#stage-nav"),
    stageTitle:    $("#stage-title"),
    stageForm:     $("#stage-form"),
    pickerView:    $("#picker-view"),
    formView:      $("#form-view"),
    taskTable:     $("#task-table"),
    stageBar:      $("#stage-progress-bar"),
    stageText:     $("#stage-progress-text"),
    stageDetail:   $("#stage-progress-detail"),
    backBtn:       $("#back-btn"),
    exportXlsx:    $("#export-xlsx"),
    exportPdf:     $("#export-pdf"),
    exportCsv:     $("#export-csv"),
    saveIndicator: $("#save-indicator"),
    toast:         $("#toast"),
    modal:         $("#modal"),
    modalCancel:   $("#modal-cancel"),
    modalConfirm:  $("#modal-confirm"),
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
    els.modalConfirm.onclick = () => { closeModal(); onConfirm?.(); };
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

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ---------- Save indicator ----------
  function showSaving() {
    els.saveIndicator.textContent = "Guardando…";
    els.saveIndicator.dataset.state = "saving";
  }
  function showSaved() {
    els.saveIndicator.textContent = "Guardado";
    els.saveIndicator.dataset.state = "saved";
    clearTimeout(showSaved._t);
    showSaved._t = setTimeout(() => {
      els.saveIndicator.textContent = "";
      delete els.saveIndicator.dataset.state;
    }, 2000);
  }

  // ---------- Supabase API ----------
  async function listChecklists(stageId) {
    const { data, error } = await db
      .from("checklists")
      .select("id, colaborador, tareas_totales, tareas_finalizadas, resultado, updated_at")
      .eq("stage_id", stageId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function createChecklist(stage) {
    const taskCount = flattenTasks(stage).length;
    const { data, error } = await db
      .from("checklists")
      .insert({
        stage_id: stage.id,
        stage_name: stage.name,
        meta: {
          colaborador: "", entrenador: "",
          legajo_entrenador: "", legajo_colaborador: "",
          fecha_inicio: "", fecha_fin: "",
          resultado: "", observaciones: "",
          puesto: stage.name,
        },
        tasks: {},
        tareas_totales: taskCount,
        tareas_finalizadas: 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function loadChecklist(id) {
    const { data, error } = await db
      .from("checklists")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  async function saveChecklist(id, patch) {
    const { error } = await db.from("checklists").update(patch).eq("id", id);
    if (error) throw error;
  }

  async function removeChecklist(id) {
    const { error } = await db.from("checklists").delete().eq("id", id);
    if (error) throw error;
  }

  // ---------- Autosave (debounce 500 ms) ----------
  const debouncedSave = debounce(async () => {
    if (!state.currentChecklistId || !state.currentChecklist) return;
    showSaving();
    const { meta, tasks } = state.currentChecklist;
    const stage = state.stages.find((s) => s.id === state.currentStageId);
    const allTasks = stage ? flattenTasks(stage) : [];
    const total = allTasks.length;
    const done = allTasks.filter((t) => tasks[t.id]?.estado === "Finalizado").length;
    try {
      await saveChecklist(state.currentChecklistId, {
        meta,
        tasks,
        colaborador: meta.colaborador || "",
        entrenador: meta.entrenador || "",
        resultado: meta.resultado || "",
        tareas_totales: total,
        tareas_finalizadas: done,
      });
      showSaved();
    } catch (err) {
      console.error("[Dino Talento] Error guardando:", err);
      els.saveIndicator.textContent = "Error al guardar";
      els.saveIndicator.dataset.state = "error";
    }
  }, 500);

  // ---------- View mode ----------
  function setMode(mode) {
    state.mode = mode;
    const isForm = mode === "form";
    els.pickerView.hidden = isForm;
    els.formView.hidden = !isForm;
    els.backBtn.hidden = !isForm;
    els.exportXlsx.hidden = !isForm;
    els.exportPdf.hidden = !isForm;
    els.exportCsv.hidden = !isForm;
  }

  // ---------- Render: sidebar ----------
  function renderSidebar() {
    els.stageNav.innerHTML = "";
    state.stages.forEach((stage) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `stage-nav-item ${state.currentStageId === stage.id ? "active" : ""}`;
      btn.innerHTML = `<div class="top-row"><span>${escapeHtml(stage.name)}</span></div>`;
      btn.addEventListener("click", () => setCurrentStage(stage.id));
      els.stageNav.appendChild(btn);
    });
  }

  // ---------- Render: picker ----------
  async function renderPicker(stage) {
    setMode("picker");
    els.stageTitle.textContent = stage.name;
    els.pickerView.innerHTML = `<div class="picker"><div class="picker-loading">Cargando…</div></div>`;

    try {
      state.pickerItems = await listChecklists(stage.id);
    } catch (err) {
      els.pickerView.innerHTML = `<div class="picker"><div class="picker-empty">Error al cargar: ${escapeHtml(err.message)}</div></div>`;
      return;
    }

    const inProgress = state.pickerItems.filter((c) => !c.resultado);
    const finished   = state.pickerItems.filter((c) => !!c.resultado);

    function fmtDate(iso) {
      if (!iso) return "";
      return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    }

    function renderItems(items) {
      return items.map((c) => {
        const total = c.tareas_totales || 0;
        const done  = c.tareas_finalizadas || 0;
        const pct   = total ? Math.round((done / total) * 100) : 0;
        const badge = c.resultado
          ? `<span class="picker-resultado picker-resultado--${c.resultado === "APTO" ? "apto" : "noapto"}">${escapeHtml(c.resultado)}</span>`
          : "";
        return `
          <div class="picker-item" data-id="${escapeHtml(c.id)}">
            <div class="picker-item-main">
              <div class="picker-item-name">${escapeHtml(c.colaborador || "Sin nombre")} ${badge}</div>
              <div class="picker-item-meta">${done}/${total} tareas · ${fmtDate(c.updated_at)}</div>
              <div class="picker-mini-progress"><div class="picker-mini-bar" style="width:${pct}%"></div></div>
            </div>
            <button class="btn btn-ghost btn-sm picker-delete" data-id="${escapeHtml(c.id)}" title="Eliminar" type="button">🗑</button>
          </div>`;
      }).join("");
    }

    const inProgressHtml = inProgress.length
      ? `<div class="picker-section"><div class="picker-section-title">En progreso</div>${renderItems(inProgress)}</div>`
      : "";
    const finishedHtml = finished.length
      ? `<div class="picker-section"><div class="picker-section-title">Finalizados</div>${renderItems(finished)}</div>`
      : "";
    const emptyHtml = !state.pickerItems.length
      ? `<div class="picker-empty">No hay checklists para este puesto todavía.<br>Creá el primero con el botón de abajo.</div>`
      : "";

    els.pickerView.innerHTML = `
      <div class="picker">
        <div class="picker-header">${escapeHtml(stage.name)} — Checklists</div>
        ${inProgressHtml}${finishedHtml}${emptyHtml}
        <div class="picker-footer">
          <button class="btn picker-new" id="picker-new-btn" type="button">➕ Nuevo colaborador</button>
        </div>
      </div>`;

    // Wire: abrir item
    els.pickerView.querySelectorAll(".picker-item").forEach((item) => {
      item.addEventListener("click", async (e) => {
        if (e.target.closest(".picker-delete")) return;
        await openChecklist(item.dataset.id, stage);
      });
    });

    // Wire: eliminar item
    els.pickerView.querySelectorAll(".picker-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const item = state.pickerItems.find((c) => c.id === id);
        openModal({
          title: "¿Eliminar checklist?",
          body: `Se eliminará el expediente de "${item?.colaborador || "Sin nombre"}". Esta acción no se puede deshacer.`,
          onConfirm: async () => {
            try {
              await removeChecklist(id);
              showToast("Checklist eliminado");
              await renderPicker(stage);
            } catch (err) {
              showToast("Error al eliminar: " + err.message);
            }
          },
        });
      });
    });

    // Wire: nuevo
    $("#picker-new-btn").addEventListener("click", async () => {
      try {
        const row = await createChecklist(stage);
        await openChecklist(row.id, stage);
      } catch (err) {
        showToast("Error al crear: " + err.message);
      }
    });
  }

  // ---------- Abrir un checklist ----------
  async function openChecklist(id, stage) {
    try {
      const row = await loadChecklist(id);
      state.currentChecklistId = row.id;
      state.currentChecklist = { meta: row.meta || {}, tasks: row.tasks || {} };
      pushState(stage.id, row.id);
      setMode("form");
      els.stageTitle.textContent = stage.name;
      renderForm(stage);
      renderStageProgress(stage);
      renderTaskTable(stage);
    } catch (err) {
      showToast("Error al cargar: " + err.message);
    }
  }

  // ---------- Render: form (cabecera) ----------
  function renderForm(stage) {
    const meta = state.currentChecklist?.meta || {};
    els.stageForm.querySelectorAll("[data-meta]").forEach((el) => {
      const key = el.dataset.meta;
      el.value = key === "puesto" ? stage.name : (meta[key] ?? "");
    });
  }

  // ---------- Render: progress ----------
  function renderStageProgress(stage) {
    const all   = flattenTasks(stage);
    const tasks = state.currentChecklist?.tasks || {};
    const done  = all.filter((t) => tasks[t.id]?.estado === "Finalizado").length;
    const total = all.length;
    const pct   = total ? Math.round((done / total) * 100) : 0;
    els.stageBar.style.width = `${pct}%`;
    els.stageText.textContent = `${pct}%`;
    els.stageDetail.textContent = `${done} / ${total} tareas finalizadas`;
  }

  // ---------- Render: task table ----------
  function renderTaskTable(stage) {
    const tasks = flattenTasks(stage);
    const data  = state.currentChecklist?.tasks || {};

    const header = `
      <div class="th">Guía de tareas</div>
      <div class="th">Fecha del encuentro</div>
      <div class="th">Estado de avance</div>
      <div class="th">Comentarios</div>`;

    const rows = tasks.map((task, i) => {
      const t = data[task.id] || {};
      const estado     = t.estado || "";
      const fecha      = t.fecha || "";
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
        </div>`;
    }).join("");

    els.taskTable.innerHTML = header + rows;

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

  // ---------- Update task field ----------
  function updateTaskField(stageId, taskId, field, value, rowEl) {
    if (!state.currentChecklist) return;
    state.currentChecklist.tasks[taskId] = state.currentChecklist.tasks[taskId] || {};
    state.currentChecklist.tasks[taskId][field] = value;
    if (field === "estado") {
      rowEl.dataset.status = value;
      const stage = state.stages.find((s) => s.id === stageId);
      if (stage) renderStageProgress(stage);
    }
    debouncedSave();
  }

  // ---------- Form wiring (cabecera) ----------
  els.stageForm.addEventListener("input", (e) => {
    const el = e.target.closest("[data-meta]");
    if (!el || !state.currentChecklist) return;
    const key = el.dataset.meta;
    if (key === "puesto") return;
    state.currentChecklist.meta = state.currentChecklist.meta || {};
    state.currentChecklist.meta[key] = el.value;
    debouncedSave();
  });

  // ---------- Back button ----------
  els.backBtn.addEventListener("click", async () => {
    state.currentChecklistId = null;
    state.currentChecklist = null;
    pushState(state.currentStageId, null);
    const stage = state.stages.find((s) => s.id === state.currentStageId);
    if (stage) { renderSidebar(); await renderPicker(stage); }
  });

  // ---------- Set current stage ----------
  async function setCurrentStage(stageId) {
    state.currentStageId = stageId;
    state.currentChecklistId = null;
    state.currentChecklist = null;
    renderSidebar();
    const stage = state.stages.find((s) => s.id === stageId);
    if (stage) await renderPicker(stage);
  }

  // ---------- Exports (checklist actual) ----------
  function getExportData() {
    const stage = state.stages.find((s) => s.id === state.currentStageId);
    const meta  = state.currentChecklist?.meta || {};
    const tasks = state.currentChecklist?.tasks || {};
    return { stage, meta, tasks };
  }

  function exportToCSV() {
    const { stage, meta, tasks } = getExportData();
    if (!stage) { showToast("Abrí un checklist primero"); return; }
    const rows = flattenTasks(stage).map((t, i) => {
      const d = tasks[t.id] || {};
      return {
        "#": i + 1, Puesto: stage.name, Colaborador: meta.colaborador || "",
        Tarea: t.title, "Fecha del encuentro": d.fecha || "",
        "Estado de avance": d.estado || "", Comentarios: d.comentario || "",
      };
    });
    triggerDownload(new Blob([Papa.unparse(rows)], { type: "text/csv;charset=utf-8;" }), filename("csv"));
    showToast("CSV descargado");
  }

  function exportToXLSX() {
    const { stage, meta, tasks } = getExportData();
    if (!stage) { showToast("Abrí un checklist primero"); return; }
    const aoa = [
      ["Dino Talento"], ["PROGRAMA FORMACIONES"], ['"Tu Desarrollo en Grupo Dinosaurio"'], [],
      ["Apellido y Nombre del entrenador:", meta.entrenador || ""],
      ["Nº de Legajo:", meta.legajo_entrenador || ""],
      ["Apellido y Nombre del colaborador entrenado:", meta.colaborador || ""],
      ["Nº de Legajo:", meta.legajo_colaborador || ""],
      ["Fecha de Inicio del entrenamiento:", meta.fecha_inicio || ""],
      ["Fecha de Fin del entrenamiento:", meta.fecha_fin || ""],
      ["Puesto en el que se entrenó:", stage.name],
      ["Resultado:", meta.resultado || ""],
      ["Observaciones:", meta.observaciones || ""], [],
      ["Guía de tareas", "Fecha del encuentro", "Estado de avance", "Comentarios"],
    ];
    flattenTasks(stage).forEach((t) => {
      const d = tasks[t.id] || {};
      aoa.push([t.title, d.fecha || "", d.estado || "", d.comentario || ""]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 60 }, { wch: 18 }, { wch: 18 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, stage.name.replace(/[\\\/\*\?\:\[\]]/g, "").slice(0, 31));
    XLSX.writeFile(wb, filename("xlsx"));
    showToast("Excel descargado");
  }

  function exportToPDF() {
    const { stage, meta, tasks } = getExportData();
    if (!stage) { showToast("Abrí un checklist primero"); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    let y = 48;

    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("Dino Talento", marginX, y); y += 16;
    doc.setFontSize(11); doc.setTextColor(90);
    doc.text('PROGRAMA FORMACIONES — "Tu Desarrollo en Grupo Dinosaurio"', marginX, y);
    y += 18; doc.setTextColor(0);

    doc.autoTable({
      startY: y, margin: { left: marginX, right: marginX },
      body: [
        ["Entrenador", meta.entrenador || "", "Nº Legajo", meta.legajo_entrenador || ""],
        ["Colaborador entrenado", meta.colaborador || "", "Nº Legajo", meta.legajo_colaborador || ""],
        ["Fecha inicio", meta.fecha_inicio || "", "Fecha fin", meta.fecha_fin || ""],
        ["Puesto", stage.name, "Resultado", meta.resultado || ""],
      ],
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [241, 243, 249], cellWidth: 110 },
        2: { fontStyle: "bold", fillColor: [241, 243, 249], cellWidth: 80 },
      },
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 6;

    if (meta.observaciones) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("Observaciones:", marginX, y + 12);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(meta.observaciones, 515);
      doc.text(wrapped, marginX, y + 26);
      y += 26 + wrapped.length * 12;
    }

    doc.autoTable({
      startY: y + 8, margin: { left: marginX, right: marginX },
      head: [["#", "Guía de tareas", "Fecha", "Estado", "Comentarios"]],
      body: flattenTasks(stage).map((t, i) => {
        const d = tasks[t.id] || {};
        return [i + 1, t.title, d.fecha || "", d.estado || "", d.comentario || ""];
      }),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [46, 125, 50], textColor: 255 },
      alternateRowStyles: { fillColor: [246, 247, 251] },
      columnStyles: { 0: { cellWidth: 24, halign: "center" }, 2: { cellWidth: 70 }, 3: { cellWidth: 70 }, 4: { cellWidth: 140 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const v = data.cell.raw;
          if (v === "Finalizado")  data.cell.styles.textColor = [22, 120, 60];
          else if (v === "En proceso") data.cell.styles.textColor = [180, 110, 10];
          else if (v === "Pendiente")  data.cell.styles.textColor = [90, 90, 90];
        }
      },
    });

    doc.save(filename("pdf"));
    showToast("PDF descargado");
  }

  els.exportXlsx.addEventListener("click", exportToXLSX);
  els.exportCsv.addEventListener("click", exportToCSV);
  els.exportPdf.addEventListener("click", exportToPDF);

  function filename(ext) {
    const stage = state.stages.find((s) => s.id === state.currentStageId);
    const sp = (stage?.name || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 20);
    const cp = (state.currentChecklist?.meta?.colaborador || "sin-nombre").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 20) || "sin-nombre";
    return `dino-talento-${sp}-${cp}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Boot ----------
  async function boot() {
    // Verificar credenciales
    if (credsMissing) {
      els.pickerView.hidden = false;
      els.pickerView.innerHTML = `
        <div class="config-pending">
          <div class="config-pending-icon">⚙️</div>
          <h2>Configuración pendiente</h2>
          <p>Faltan credenciales de Supabase en <code>data.js</code>.</p>
          <p>Completá <code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code> y recargá la página.</p>
        </div>`;
      return;
    }

    try {
      const allStages = await window.DineoData.loadStages();

      if (lockedStageId) {
        const locked = allStages.find((s) => s.id === lockedStageId);
        if (!locked) {
          els.pickerView.hidden = false;
          els.pickerView.innerHTML = `
            <div class="config-pending">
              <h2>Puesto no encontrado</h2>
              <p>El stage <code>${escapeHtml(lockedStageId)}</code> no existe.</p>
              <p>IDs válidos: ${allStages.map((s) => `<code>${escapeHtml(s.id)}</code>`).join(" · ")}</p>
            </div>`;
          return;
        }
        state.stages = [locked];
        document.body.classList.add("single-stage");
      } else {
        state.stages = allStages;
      }

      const initial = lockedStageId || state.stages[0]?.id || null;
      if (initial) {
        await setCurrentStage(initial);
        if (resumeChecklist) {
          const stage = state.stages.find((s) => s.id === initial);
          if (stage) await openChecklist(resumeChecklist, stage);
        }
      }
    } catch (err) {
      console.error(err);
      els.pickerView.hidden = false;
      els.pickerView.innerHTML = `<div class="config-pending"><p>Error cargando datos. Revisá la consola.</p></div>`;
    }
  }

  boot();
})();
