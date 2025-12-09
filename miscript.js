
  const STORAGE_KEY = "ausentismoRegistros";

let modalState = {
  mode: null,   // 'single' o 'all'
  index: null   // índice del registro a borrar si es 'single'
};

/* ===============================
   AL INICIAR
================================ */
document.addEventListener("DOMContentLoaded", () => {
  configurarModal();
  mostrarRegistrosGuardados();
});

/* ===============================
   CALCULAR Y GUARDAR
================================ */
function calcularAusentismo() {
  const region = document.getElementById("region").value.trim();
  const mes = document.getElementById("mes").value;
  const empleados = Number(document.getElementById("empleados").value);
  const diasLaborables = Number(document.getElementById("diasLaborables").value);
  const diasPerdidos = Number(document.getElementById("diasPerdidos").value);
  const resultado = document.getElementById("resultado");

  if (!region || !mes || empleados <= 0 || diasLaborables <= 0 || diasPerdidos < 0) {
    resultado.textContent = "Por favor completá todos los campos con valores válidos.";
    return;
  }

  const totalDiasPosibles = empleados * diasLaborables;
  const porcentajeAusentismo = (diasPerdidos / totalDiasPosibles) * 100;

  resultado.textContent =
    `El índice de ausentismo para ${region} en ${mes} es del ${porcentajeAusentismo.toFixed(2)} %.`;

  const registro = {
    region,
    mes,
    empleados,
    diasLaborables,
    diasPerdidos,
    porcentaje: porcentajeAusentismo.toFixed(2),
    fechaRegistro: new Date().toLocaleString("es-AR")
  };

  const registros = obtenerRegistros();
  registros.push(registro);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));

  mostrarRegistrosGuardados();
}

/* ===============================
   LOCALSTORAGE HELPERS
================================ */
function obtenerRegistros() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/* ===============================
   MOSTRAR TABLAS
================================ */
function mostrarRegistrosGuardados() {
  const registros = obtenerRegistros();
  const tbody = document.querySelector("#tablaRegistros tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  registros.forEach((reg, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${reg.region}</td>
      <td>${reg.mes}</td>
      <td>${reg.empleados}</td>
      <td>${reg.diasLaborables}</td>
      <td>${reg.diasPerdidos}</td>
      <td>${reg.porcentaje} %</td>
      <td>${reg.fechaRegistro}</td>
      <td>
        <button type="button" class="btn-row-delete" data-index="${index}">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Eventos de eliminación individual
  tbody.querySelectorAll(".btn-row-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      abrirModalBorradoIndividual(idx);
    });
  });

  actualizarResumen();
}

/* ===============================
   RESUMEN POR REGIÓN Y MES
================================ */
function actualizarResumen() {
  const registros = obtenerRegistros();
  const tbody = document.querySelector("#tablaResumen tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (registros.length === 0) {
    return;
  }

  // Agrupar por región + mes
  const mapa = {};

  registros.forEach(reg => {
    const clave = `${reg.region}___${reg.mes}`;
    if (!mapa[clave]) {
      mapa[clave] = {
        region: reg.region,
        mes: reg.mes,
        empleados: 0,
        diasLaborables: 0,
        diasPerdidos: 0,
        porcentajes: []
      };
    }
    mapa[clave].empleados += reg.empleados;
    mapa[clave].diasLaborables += reg.diasLaborables;
    mapa[clave].diasPerdidos += reg.diasPerdidos;
    mapa[clave].porcentajes.push(Number(reg.porcentaje));
  });

  Object.values(mapa).forEach(grupo => {
    const promedio =
      grupo.porcentajes.reduce((acc, val) => acc + val, 0) / grupo.porcentajes.length;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${grupo.region}</td>
      <td>${grupo.mes}</td>
      <td>${grupo.empleados}</td>
      <td>${grupo.diasLaborables}</td>
      <td>${grupo.diasPerdidos}</td>
      <td>${promedio.toFixed(2)} %</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ===============================
   RESET FORMULARIO
================================ */
function resetearFormulario() {
  document.getElementById("ausentismoForm").reset();
  document.getElementById("resultado").textContent = "";
}

/* ===============================
   EXPORTAR A CSV (Excel)
================================ */
function exportarAExcel() {
  const registros = obtenerRegistros();

  if (registros.length === 0) {
    alert("No hay registros guardados para exportar.");
    return;
  }

  let csv = "Región;Mes;Empleados;Días laborables;Días perdidos;% Ausentismo;Fecha registro\n";

  registros.forEach(reg => {
    csv +=
      `"${reg.region}";"${reg.mes}";"${reg.empleados}";"${reg.diasLaborables}";"${reg.diasPerdidos}";"${reg.porcentaje}";"${reg.fechaRegistro}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "ausentismo_correo_argentino.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ===============================
   EXPORTAR EXCEL DETALLADO
   (2 CSV: detalle + resumen)
================================ */
function exportarExcelDetallado() {
  const registros = obtenerRegistros();

  if (registros.length === 0) {
    alert("No hay registros guardados para exportar.");
    return;
  }

  // 1) CSV de detalle
  let csvDetalle = "Región;Mes;Empleados;Días laborables;Días perdidos;% Ausentismo;Fecha registro\n";

  registros.forEach(reg => {
    csvDetalle +=
      `"${reg.region}";"${reg.mes}";"${reg.empleados}";"${reg.diasLaborables}";"${reg.diasPerdidos}";"${reg.porcentaje}";"${reg.fechaRegistro}"\n`;
  });

  descargarArchivo(csvDetalle, "ausentismo_detalle.csv");

  // 2) CSV de resumen (usamos la misma lógica del resumen en tabla)
  const mapa = {};

  registros.forEach(reg => {
    const clave = `${reg.region}___${reg.mes}`;
    if (!mapa[clave]) {
      mapa[clave] = {
        region: reg.region,
        mes: reg.mes,
        empleados: 0,
        diasLaborables: 0,
        diasPerdidos: 0,
        porcentajes: []
      };
    }
    mapa[clave].empleados += reg.empleados;
    mapa[clave].diasLaborables += reg.diasLaborables;
    mapa[clave].diasPerdidos += reg.diasPerdidos;
    mapa[clave].porcentajes.push(Number(reg.porcentaje));
  });

  let csvResumen = "Región;Mes;Empleados totales;Días laborables totales;Días perdidos totales;% Ausentismo promedio\n";

  Object.values(mapa).forEach(grupo => {
    const promedio =
      grupo.porcentajes.reduce((acc, val) => acc + val, 0) / grupo.porcentajes.length;

    csvResumen +=
      `"${grupo.region}";"${grupo.mes}";"${grupo.empleados}";"${grupo.diasLaborables}";"${grupo.diasPerdidos}";"${promedio.toFixed(2)}"\n`;
  });

  descargarArchivo(csvResumen, "ausentismo_resumen.csv");
}

/* ===============================
   EXPORTAR JSON (Power BI / dashboards)
================================ */
function exportarJSON() {
  const registros = obtenerRegistros();

  if (registros.length === 0) {
    alert("No hay registros guardados para exportar.");
    return;
  }

  const jsonStr = JSON.stringify(registros, null, 2);
  descargarArchivo(jsonStr, "ausentismo_correo_argentino.json", "application/json;charset=utf-8;");
}

/* ===============================
   HELPER PARA DESCARGAS
   (reutilizable para CSV / JSON)
================================ */
function descargarArchivo(contenido, nombreArchivo, tipo = "text/csv;charset=utf-8;") {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


/* ===============================
   BORRADO TOTAL (USANDO MODAL)
================================ */
function borrarRegistros() {
  const registros = obtenerRegistros();
  if (registros.length === 0) {
    alert("No hay registros para borrar.");
    return;
  }
  abrirModalBorradoTodos();
}

/* ===============================
   MODAL DE CONFIRMACIÓN
================================ */
function configurarModal() {
  const modal = document.getElementById("modalConfirm");
  if (!modal) return;

  const btnCancel = document.getElementById("modalCancel");
  const btnConfirm = document.getElementById("modalConfirmBtn");

  btnCancel.addEventListener("click", cerrarModal);

  btnConfirm.addEventListener("click", () => {
    if (modalState.mode === "single" && modalState.index !== null) {
      borrarRegistroIndividual(modalState.index);
    } else if (modalState.mode === "all") {
      borrarTodosLosRegistros();
    }
    cerrarModal();
  });

  // Cerrar si se hace click fuera del contenido
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      cerrarModal();
    }
  });
}

function abrirModalBorradoIndividual(index) {
  modalState.mode = "single";
  modalState.index = index;

  const modal = document.getElementById("modalConfirm");
  const title = document.getElementById("modalTitle");
  const msg = document.getElementById("modalMessage");

  title.textContent = "Eliminar registro";
  msg.textContent =
    "¿Estás seguro de que querés eliminar este registro de ausentismo? Esta acción no se puede deshacer.";

  modal.classList.add("show");
}

function abrirModalBorradoTodos() {
  modalState.mode = "all";
  modalState.index = null;

  const modal = document.getElementById("modalConfirm");
  const title = document.getElementById("modalTitle");
  const msg = document.getElementById("modalMessage");

  title.textContent = "Eliminar todos los registros";
  msg.textContent =
    "⚠️ Esta acción eliminará TODOS los registros guardados. ¿Seguro que querés continuar?";

  modal.classList.add("show");
}

function cerrarModal() {
  const modal = document.getElementById("modalConfirm");
  if (modal) {
    modal.classList.remove("show");
  }
  modalState.mode = null;
  modalState.index = null;
}

/* ===============================
   BORRADO LÓGICO
================================ */
function borrarRegistroIndividual(index) {
  const registros = obtenerRegistros();
  if (index < 0 || index >= registros.length) return;

  registros.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));

  mostrarRegistrosGuardados();
  document.getElementById("resultado").textContent = "";
}

function borrarTodosLosRegistros() {
  localStorage.removeItem(STORAGE_KEY);

  const tbody = document.querySelector("#tablaRegistros tbody");
  if (tbody) tbody.innerHTML = "";

  const tbodyRes = document.querySelector("#tablaResumen tbody");
  if (tbodyRes) tbodyRes.innerHTML = "";

  document.getElementById("resultado").textContent = "";
}

/* ===============================
   IMPRIMIR REPORTE
================================ */
function imprimirReporte() {
  window.print();
}
