/**
 * app.js — Dino Talento (Programa Formaciones · Grupo Dinosaurio)
 *
 * Jerarquía: Sucursal → Puesto (6) → Colaborador → Checklist
 * Persistencia: Supabase (tabla checklists).
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
  const urlParams        = new URLSearchParams(window.location.search);
  const lockedSucursalId = urlParams.get("sucursal") || null;
  const resumeChecklist  = urlParams.get("checklist") || null;
  const LS_KEY           = "dino_talento_usuario";

  // Usuario activo (desde localStorage)
  let JEFE_ID = localStorage.getItem(LS_KEY) || "";

  function pushState(sucursalId, checklistId) {
    const p = new URLSearchParams(window.location.search);
    if (sucursalId)  p.set("sucursal",  sucursalId);
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
    sucursales: [],
    stages: [],
    currentSucursalId: null,
    currentStageId: null,        // stage del checklist abierto en form
    expandedStageIds: new Set(), // puestos expandidos en el picker
    mode: "picker",              // "picker" | "form"
    currentChecklistId: null,
    currentChecklist: null,
    pickerChecklists: [],        // todos los checklists de la sucursal activa
  };

  // ---------- Elements ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    loginScreen:   $("#login-screen"),
    loginForm:     $("#login-form"),
    loginInput:    $("#login-input"),
    userLabel:     $("#current-user-label"),
    logoutBtn:     $("#logout-btn"),
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

  function fmtDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
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
  async function listChecklistsBySucursal(sucursalId) {
    let q = db
      .from("checklists")
      .select("id, stage_id, colaborador, tareas_totales, tareas_finalizadas, resultado, updated_at")
      .eq("sucursal_id", sucursalId);
    if (JEFE_ID) q = q.eq("jefe_id", JEFE_ID);
    q = q.order("updated_at", { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function createChecklist(sucursal, stage) {
    const taskCount = flattenTasks(stage).length;
    const { data, error } = await db
      .from("checklists")
      .insert({
        sucursal_id:   sucursal.id,
        sucursal_name: sucursal.name,
        stage_id:      stage.id,
        stage_name:    stage.name,
        jefe_id:       JEFE_ID || null,
        meta: {
          colaborador: "", entrenador: "",
          legajo_entrenador: "", legajo_colaborador: "",
          fecha_inicio: "", fecha_fin: "",
          resultado: "", observaciones: "",
          puesto: stage.name,
        },
        tasks: {},
        tareas_totales:     taskCount,
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
    const done  = allTasks.filter((t) => tasks[t.id]?.estado === "Finalizado").length;
    try {
      await saveChecklist(state.currentChecklistId, {
        meta, tasks,
        colaborador: meta.colaborador || "",
        entrenador:  meta.entrenador  || "",
        resultado:   meta.resultado   || "",
        tareas_totales:     total,
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
    els.pickerView.hidden =  isForm;
    els.formView.hidden   = !isForm;
    els.backBtn.hidden    = !isForm;
    els.exportXlsx.hidden = !isForm;
    els.exportPdf.hidden  = !isForm;
    els.exportCsv.hidden  = !isForm;
  }

  // ---------- Render: sidebar (sucursales) ----------
  function renderSidebar() {
    els.stageNav.innerHTML = "";
    state.sucursales.forEach((suc) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `stage-nav-item ${state.currentSucursalId === suc.id ? "active" : ""}`;
      btn.innerHTML = `<div class="top-row"><span>${escapeHtml(suc.name)}</span></div>`;
      btn.addEventListener("click", () => setCurrentSucursal(suc.id));
      els.stageNav.appendChild(btn);
    });
  }

  // ---------- Render: puesto picker ----------
  async function renderPicker(sucursal) {
    setMode("picker");
    els.stageTitle.textContent = sucursal.name;
    els.pickerView.innerHTML = `<div class="picker-loading">Cargando…</div>`;

    try {
      state.pickerChecklists = await listChecklistsBySucursal(sucursal.id);
    } catch (err) {
      els.pickerView.innerHTML = `<div class="config-pending"><p>Error al cargar: ${escapeHtml(err.message)}</p></div>`;
      return;
    }

    // Agrupar por stage_id
    const byStage = {};
    state.stages.forEach((s) => { byStage[s.id] = []; });
    state.pickerChecklists.forEach((c) => {
      if (byStage[c.stage_id] !== undefined) byStage[c.stage_id].push(c);
    });

    const container = document.createElement("div");
    container.className = "puesto-picker";

    state.stages.forEach((stage) => {
      const collabs = byStage[stage.id] || [];
      container.appendChild(buildPuestoCard(sucursal, stage, collabs));
    });

    els.pickerView.innerHTML = "";
    els.pickerView.appendChild(container);
  }

  function buildPuestoCard(sucursal, stage, collabs) {
    const isOpen = state.expandedStageIds.has(stage.id);

    const card = document.createElement("div");
    card.className = `puesto-card${isOpen ? " open" : ""}`;
    card.dataset.stageId = stage.id;

    // Header
    const header = document.createElement("div");
    header.className = "puesto-card-header";
    header.innerHTML = `
      <span class="puesto-card-name">${escapeHtml(stage.name)}</span>
      <span class="puesto-card-count">${collabs.length} colaborador${collabs.length !== 1 ? "es" : ""}</span>
      <span class="puesto-card-chevron">${isOpen ? "▲" : "▼"}</span>`;
    header.addEventListener("click", () => togglePuestoCard(card, stage.id));

    // Body
    const body = document.createElement("div");
    body.className = `puesto-card-body${isOpen ? " open" : ""}`;

    if (collabs.length === 0) {
      const empty = document.createElement("div");
      empty.className = "puesto-card-empty";
      empty.textContent = "Sin colaboradores aún.";
      body.appendChild(empty);
    } else {
      collabs.forEach((c) => body.appendChild(buildCollabItem(c, sucursal, stage)));
    }

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn puesto-add-btn";
    addBtn.textContent = "➕ Agregar colaborador";
    addBtn.addEventListener("click", async () => {
      try {
        const row = await createChecklist(sucursal, stage);
        state.expandedStageIds.add(stage.id);
        await openChecklist(row.id, stage, sucursal);
      } catch (err) {
        showToast("Error al crear: " + err.message);
      }
    });
    body.appendChild(addBtn);

    card.appendChild(header);
    card.appendChild(body);
    return card;
  }

  function togglePuestoCard(cardEl, stageId) {
    const body    = cardEl.querySelector(".puesto-card-body");
    const chevron = cardEl.querySelector(".puesto-card-chevron");
    const isOpen  = state.expandedStageIds.has(stageId);
    if (isOpen) {
      state.expandedStageIds.delete(stageId);
      cardEl.classList.remove("open");
      body.classList.remove("open");
      chevron.textContent = "▼";
    } else {
      state.expandedStageIds.add(stageId);
      cardEl.classList.add("open");
      body.classList.add("open");
      chevron.textContent = "▲";
    }
  }

  function buildCollabItem(c, sucursal, stage) {
    const total = c.tareas_totales    || 0;
    const done  = c.tareas_finalizadas || 0;
    const pct   = total ? Math.round((done / total) * 100) : 0;
    const badge = c.resultado
      ? `<span class="picker-resultado picker-resultado--${c.resultado === "APTO" ? "apto" : "noapto"}">${escapeHtml(c.resultado)}</span>`
      : "";

    const item = document.createElement("div");
    item.className = "puesto-collab-item";
    item.innerHTML = `
      <div class="puesto-collab-main">
        <div class="puesto-collab-name">${escapeHtml(c.colaborador || "Sin nombre")} ${badge}</div>
        <div class="puesto-collab-meta">${done}/${total} tareas · ${fmtDate(c.updated_at)}</div>
        <div class="picker-mini-progress"><div class="picker-mini-bar" style="width:${pct}%"></div></div>
      </div>
      <button class="btn btn-ghost btn-sm collab-delete" title="Eliminar" type="button">🗑</button>`;

    item.addEventListener("click", async (e) => {
      if (e.target.closest(".collab-delete")) return;
      await openChecklist(c.id, stage, sucursal);
    });

    item.querySelector(".collab-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      openModal({
        title: "¿Eliminar checklist?",
        body:  `Se eliminará el expediente de "${c.colaborador || "Sin nombre"}". Esta acción no se puede deshacer.`,
        onConfirm: async () => {
          try {
            await removeChecklist(c.id);
            showToast("Checklist eliminado");
            const suc = state.sucursales.find((s) => s.id === state.currentSucursalId);
            if (suc) await renderPicker(suc);
          } catch (err) {
            showToast("Error al eliminar: " + err.message);
          }
        },
      });
    });

    return item;
  }

  // ---------- Abrir un checklist ----------
  async function openChecklist(id, stage, sucursal) {
    try {
      const row = await loadChecklist(id);
      state.currentChecklistId = row.id;
      state.currentStageId     = stage.id;
      state.currentChecklist   = { meta: row.meta || {}, tasks: row.tasks || {} };
      pushState(sucursal.id, row.id);
      setMode("form");
      els.stageTitle.textContent = `${sucursal.name} · ${stage.name}`;
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
    els.stageBar.style.width      = `${pct}%`;
    els.stageText.textContent     = `${pct}%`;
    els.stageDetail.textContent   = `${done} / ${total} tareas finalizadas`;
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
      return `
        <div class="task-row" data-task-id="${escapeHtml(task.id)}" data-status="${escapeHtml(t.estado || "")}" style="display:contents">
          <div class="cell-task">
            <span class="index">${i + 1}.</span>
            <span class="title">${escapeHtml(task.title)}</span>
          </div>
          <div class="cell-date">
            <input type="date" data-field="fecha" value="${escapeHtml(t.fecha || "")}" />
          </div>
          <div class="cell-status">
            <select data-field="estado">
              ${ESTADOS.map((e) => `<option value="${escapeHtml(e)}" ${e === (t.estado || "") ? "selected" : ""}>${e || "—"}</option>`).join("")}
            </select>
          </div>
          <div class="cell-comment">
            <textarea data-field="comentario" rows="1" placeholder="Comentarios…">${escapeHtml(t.comentario || "")}</textarea>
          </div>
        </div>`;
    }).join("");

    els.taskTable.innerHTML = header + rows;

    els.taskTable.querySelectorAll(".task-row").forEach((row) => {
      const taskId = row.dataset.taskId;
      row.querySelectorAll("[data-field]").forEach((input) => {
        const field   = input.dataset.field;
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
    state.currentChecklist   = null;
    pushState(state.currentSucursalId, null);
    const suc = state.sucursales.find((s) => s.id === state.currentSucursalId);
    if (suc) { renderSidebar(); await renderPicker(suc); }
  });

  // ---------- Set current sucursal ----------
  async function setCurrentSucursal(sucursalId) {
    state.currentSucursalId  = sucursalId;
    state.currentChecklistId = null;
    state.currentChecklist   = null;
    renderSidebar();
    const suc = state.sucursales.find((s) => s.id === sucursalId);
    if (suc) await renderPicker(suc);
  }

  // ---------- Exports ----------
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
    const suc = state.sucursales.find((s) => s.id === state.currentSucursalId);
    const aoa = [
      ["Dino Talento"], ["PROGRAMA FORMACIONES"], ['"Tu Desarrollo en Grupo Dinosaurio"'], [],
      ["Sucursal:", suc?.name || ""],
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
    const suc = state.sucursales.find((s) => s.id === state.currentSucursalId);
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
        ["Sucursal", suc?.name || "", "", ""],
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
          if (v === "Finalizado")    data.cell.styles.textColor = [22, 120, 60];
          else if (v === "En proceso") data.cell.styles.textColor = [180, 110, 10];
          else if (v === "Pendiente")  data.cell.styles.textColor = [90, 90, 90];
        }
      },
    });

    doc.save(filename("pdf"));
    showToast("PDF descargado");
  }

  els.exportXlsx.addEventListener("click", exportToXLSX);
  els.exportCsv.addEventListener("click",  exportToCSV);
  els.exportPdf.addEventListener("click",  exportToPDF);

  function filename(ext) {
    const suc   = state.sucursales.find((s) => s.id === state.currentSucursalId);
    const stage = state.stages.find((s) => s.id === state.currentStageId);
    const sp  = (suc?.name   || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 20);
    const st  = (stage?.name || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 15);
    const cp  = (state.currentChecklist?.meta?.colaborador || "sin-nombre").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 15) || "sin-nombre";
    return `dino-${sp}-${st}-${cp}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Login / sesión ----------
  function showLoginScreen() {
    els.loginScreen.hidden = false;
    els.loginInput.value = "";
    setTimeout(() => els.loginInput.focus(), 50);
  }

  function applySession(usuario) {
    JEFE_ID = usuario.trim();
    localStorage.setItem(LS_KEY, JEFE_ID);
    els.loginScreen.hidden = true;
    els.userLabel.textContent = JEFE_ID;
    els.logoutBtn.hidden = false;
  }

  els.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = els.loginInput.value.trim();
    if (!val) { els.loginInput.focus(); return; }
    applySession(val);
    boot();
  });

  els.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    JEFE_ID = "";
    els.userLabel.textContent = "—";
    els.logoutBtn.hidden = true;
    showLoginScreen();
  });

  // ---------- Boot ----------
  async function boot() {
    // Si no hay usuario guardado, mostrar pantalla de login
    if (!JEFE_ID) { showLoginScreen(); return; }

    // Restaurar label del usuario en sidebar
    els.userLabel.textContent = JEFE_ID;
    els.logoutBtn.hidden = false;

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
      state.stages     = await window.DineoData.loadStages();
      state.sucursales = window.DineoData.SUCURSALES || [];

      if (!state.sucursales.length) {
        els.pickerView.hidden = false;
        els.pickerView.innerHTML = `<div class="config-pending"><p>No hay sucursales configuradas en <code>data.js</code>.</p></div>`;
        return;
      }

      const initialId = lockedSucursalId || state.sucursales[0]?.id;

      if (lockedSucursalId) {
        // Modo single-sucursal: ocultar sidebar
        document.body.classList.add("single-stage");
      }

      await setCurrentSucursal(initialId);

      // Reanudar checklist si viene en la URL
      if (resumeChecklist) {
        const row = await loadChecklist(resumeChecklist).catch(() => null);
        if (row) {
          const stage = state.stages.find((s) => s.id === row.stage_id);
          const suc   = state.sucursales.find((s) => s.id === row.sucursal_id);
          if (stage && suc) {
            state.expandedStageIds.add(stage.id);
            await openChecklist(row.id, stage, suc);
          }
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
