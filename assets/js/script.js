/* =====================================================
   CONFIGURACIÓN
   Si cambian las reglas, modificar principalmente aquí.
===================================================== */

const CONFIG = {
  pie: 0.25,

  cuotasMinimas: 3,
  cuotasMaximas: 12,

  maxCuotasConvenioAnterior: 48,

  limiteUF: 100,

  apiUF: "https://mindicador.cl/api/uf",
};

/* =====================================================
   ELEMENTOS DEL DOM
===================================================== */

const deudaNueva = document.querySelector("#deudaNueva");

const tieneConvenio = document.querySelector("#tieneConvenio");

const datosConvenioVigente = document.querySelector("#datosConvenioVigente");

const cuotasPendientes = document.querySelector("#cuotasPendientes");

const valorCuotaVigente = document.querySelector("#valorCuotaVigente");

const btnCalcular = document.querySelector("#btnCalcular");

const btnLimpiarCalculadora = document.querySelector("#btnLimpiarCalculadora");

const mensajeError = document.querySelector("#mensajeError");

const resultados = document.querySelector("#resultados");

const resultadoTotal = document.querySelector("#resultadoTotal");

const resultadoPie = document.querySelector("#resultadoPie");

const resultadoSaldo = document.querySelector("#resultadoSaldo");

const listaCuotas = document.querySelector("#listaCuotas");

const checklistChecks = document.querySelectorAll(".checklist-check");

const checklistContador = document.querySelector("#checklistContador");

const btnLimpiarChecklist = document.querySelector("#btnLimpiarChecklist");

const alerta = document.querySelector("#alerta");

const alertaTitulo = document.querySelector("#alertaTitulo");

const alertaMensaje = document.querySelector("#alertaMensaje");

const cerrarAlerta = document.querySelector("#cerrarAlerta");

/* =====================================================
   ESTADO
===================================================== */

let valorUF = null;

/* =====================================================
   INICIO
===================================================== */

document.addEventListener("DOMContentLoaded", iniciarAplicacion);

function iniciarAplicacion() {
  configurarEventos();

  actualizarChecklist();

  /*
    La UF se carga en segundo plano.
    No forma parte del cálculo que ve el usuario.
    Solo se utilizará para validar el límite
    máximo permitido.
  */

  cargarUF();
}

/* =====================================================
   EVENTOS
===================================================== */

function configurarEventos() {
  /* CHECKLIST */

  checklistChecks.forEach((check) => {
    check.addEventListener("change", actualizarChecklist);
  });

  btnLimpiarChecklist.addEventListener("click", limpiarChecklist);

  /* CONVENIO VIGENTE */

  tieneConvenio.addEventListener("change", actualizarConvenioVigente);

  /* FORMATO DE PESOS */

  deudaNueva.addEventListener("input", () => {
    formatearInputPesos(deudaNueva);
  });

  valorCuotaVigente.addEventListener("input", () => {
    formatearInputPesos(valorCuotaVigente);
  });

  /* CALCULADORA */

  btnCalcular.addEventListener("click", calcularConvenio);

  btnLimpiarCalculadora.addEventListener("click", limpiarCalculadora);

  /* ALERTA */

  cerrarAlerta.addEventListener("click", () => {
    alerta.close();
  });
}

/* =====================================================
   CHECKLIST
===================================================== */

function actualizarChecklist() {
  const total = checklistChecks.length;

  const revisados = [...checklistChecks].filter(
    (check) => check.checked,
  ).length;

  checklistContador.textContent = `${revisados} de ${total} revisados`;

  checklistChecks.forEach((check) => {
    const item = check.closest(".checklist-item");

    item.classList.toggle("completado", check.checked);
  });

  checklistContador.classList.toggle("bg-success", revisados === total);

  checklistContador.classList.toggle("bg-secondary", revisados !== total);
}

/* =====================================================
   LIMPIAR CHECKLIST
===================================================== */

function limpiarChecklist() {
  checklistChecks.forEach((check) => {
    check.checked = false;
  });

  actualizarChecklist();
}

/* =====================================================
   CONVENIO VIGENTE
===================================================== */

function actualizarConvenioVigente() {
  const activo = tieneConvenio.checked;

  datosConvenioVigente.classList.toggle("d-none", !activo);

  tieneConvenio.setAttribute("aria-expanded", String(activo));

  /*
    Si se desactiva el convenio vigente,
    eliminamos sus datos para que no queden
    valores anteriores escondidos.
  */

  if (!activo) {
    cuotasPendientes.value = "";
    valorCuotaVigente.value = "";
  }
}

/* =====================================================
   FORMATO DE MONTOS
===================================================== */

function formatearInputPesos(input) {
  const soloNumeros = input.value.replace(/\D/g, "");

  if (soloNumeros === "") {
    input.value = "";
    return;
  }

  input.value = Number(soloNumeros).toLocaleString("es-CL");
}

/* =====================================================
   OBTENER MONTO NUMÉRICO
===================================================== */

function obtenerMonto(valor) {
  const limpio = String(valor).replace(/\D/g, "");

  const numero = Number(limpio);

  return Number.isFinite(numero) ? numero : 0;
}

/* =====================================================
   FORMATEAR PESOS
===================================================== */

function formatearPesos(valor) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}

/* =====================================================
   UF => La UF se utiliza solo para validar el límite máximo de 100 UF.
   La calculadora trabaja en pesos.
===================================================== */

async function cargarUF() {
  try {
    const respuesta = await fetch(CONFIG.apiUF, {
      cache: "no-store",
    });

    if (!respuesta.ok) {
      throw new Error("No fue posible consultar la UF.");
    }

    const datos = await respuesta.json();

    if (!datos.serie || datos.serie.length === 0) {
      throw new Error("La API no entregó valores de UF.");
    }

    const hoyChile = obtenerFechaChile();

    const registroHoy = datos.serie.find((registro) => {
      return obtenerFechaChile(registro.fecha) === hoyChile;
    });

    /*
      Si la API todavía no trae el registro
      correspondiente al día actual,
      usamos el último valor disponible.
      Sigue siendo una validación referencial.
    */

    const registroDisponible = registroHoy ?? datos.serie[0];

    valorUF = Number(registroDisponible.valor);

    if (!Number.isFinite(valorUF) || valorUF <= 0) {
      valorUF = null;
    }
  } catch (error) {
    console.error("No fue posible cargar la UF:", error);

    valorUF = null;
  }
}

/* =====================================================
   FECHA CHILE
===================================================== */

function obtenerFechaChile(fecha = new Date()) {
  const objetoFecha = fecha instanceof Date ? fecha : new Date(fecha);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(objetoFecha);
}

/* =====================================================
   CALCULAR CONVENIO
===================================================== */

async function calcularConvenio() {
  limpiarError();
  ocultarResultados();

  /* =========================================
     1. DEUDA A CONVENIR
  ========================================= */

  const deuda = obtenerMonto(deudaNueva.value);

  if (deuda <= 0) {
    mostrarError("Ingresa una deuda a convenir válida.");

    deudaNueva.focus();

    return;
  }

  /* =========================================
     2. CONVENIO VIGENTE
  ========================================= */

  let saldoConvenioAnterior = 0;

  if (tieneConvenio.checked) {
    const cuotas = Number(cuotasPendientes.value);

    const valorCuota = obtenerMonto(valorCuotaVigente.value);

    if (
      !Number.isInteger(cuotas) ||
      cuotas < 1 ||
      cuotas > CONFIG.maxCuotasConvenioAnterior
    ) {
      mostrarError(
        `Ingresa una cantidad válida de cuotas pendientes, entre 1 y ${CONFIG.maxCuotasConvenioAnterior}.`,
      );

      cuotasPendientes.focus();

      return;
    }

    if (valorCuota <= 0) {
      mostrarError(
        "Ingresa un valor válido para la cuota del convenio vigente.",
      );

      valorCuotaVigente.focus();

      return;
    }

    /* SALDO PENDIENTE DEL CONVENIO */

    saldoConvenioAnterior = cuotas * valorCuota;
  }

  /* =========================================
     3. MONTO TOTAL ACUMULADO

     IMPORTANTE:
     primero sumamos todo y DESPUÉS
     validamos las 100 UF.
  ========================================= */

  const montoTotal = deuda + saldoConvenioAnterior;

  /* =========================================
     4. OBTENER UF
  ========================================= */

  if (!valorUF) {
    await cargarUF();
  }

  if (!valorUF) {
    mostrarAlerta(
      "No se puede validar el límite",
      "No fue posible obtener el valor de la UF. No se pueden calcular alternativas hasta validar el límite permitido.",
    );

    return;
  }

  /* =========================================
     5. VALIDAR 100 UF SOBRE EL TOTAL
  ========================================= */

  const limitePesos = valorUF * CONFIG.limiteUF;

  if (montoTotal > limitePesos) {
    mostrarAlerta(
      "Monto fuera del límite",
      "La deuda a convenir supera el límite permitido de 100 UF. Cliente debe dirigirse a una sucursal.",
    );

    return;
  }
  /* =========================================
     6. RECIÉN AHORA CALCULAMOS

     Si llegamos aquí significa que el
     monto TOTAL pasó la validación.
  ========================================= */

  const pie = montoTotal * CONFIG.pie;

  const saldo = montoTotal - pie;

  mostrarResultados({
    montoTotal,
    pie,
    saldo,
  });
}

/* 

=====================================================
   MOSTRAR RESULTADOS
===================================================== */

function mostrarResultados({ montoTotal, pie, saldo }) {
  resultadoTotal.textContent = formatearPesos(montoTotal);

  resultadoPie.textContent = formatearPesos(pie);

  resultadoSaldo.textContent = formatearPesos(saldo);

  /*
    Eliminamos las tarjetas de un cálculo anterior.
  */

  listaCuotas.innerHTML = "";

  /*
    Generamos automáticamente todas las
    alternativas entre 3 y 12 cuotas.
  */

  for (
    let cuotas = CONFIG.cuotasMinimas;
    cuotas <= CONFIG.cuotasMaximas;
    cuotas++
  ) {
    const valorCuota = saldo / cuotas;

    const tarjeta = document.createElement("div");

    tarjeta.className = "installment";

    tarjeta.innerHTML = `
      <span>
        ${cuotas} cuotas
      </span>
      <strong>
        ${formatearPesos(valorCuota)}
      </strong>
    `;

    listaCuotas.appendChild(tarjeta);
  }
  resultados.classList.remove("hidden");

  /*
    Bajamos automáticamente hasta
    los resultados para no perder tiempo.
  */

  resultados.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

/* =====================================================
   LIMPIAR CALCULADORA
===================================================== */

function limpiarCalculadora() {
  deudaNueva.value = "";

  tieneConvenio.checked = false;

  tieneConvenio.setAttribute("aria-expanded", "false");

  cuotasPendientes.value = "";

  valorCuotaVigente.value = "";

  datosConvenioVigente.classList.add("d-none");

  limpiarError();

  ocultarResultados();

  listaCuotas.innerHTML = "";

  deudaNueva.focus();
}

/* =====================================================
   ERROR
===================================================== */

function mostrarError(texto) {
  mensajeError.textContent = texto;

  mensajeError.classList.remove("hidden");
}

function limpiarError() {
  mensajeError.textContent = "";

  mensajeError.classList.add("hidden");
}

/* =====================================================
   OCULTAR RESULTADOS
===================================================== */

function ocultarResultados() {
  resultados.classList.add("hidden");
}

/* =====================================================
   ALERTA
===================================================== */

function mostrarAlerta(titulo, mensaje) {
  alertaTitulo.textContent = titulo;

  alertaMensaje.textContent = mensaje;

  if (typeof alerta.showModal === "function") {
    alerta.showModal();
  } else {
    window.alert(`${titulo}\n\n${mensaje}`);
  }
}
