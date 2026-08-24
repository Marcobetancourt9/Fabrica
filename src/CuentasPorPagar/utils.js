import * as XLSX from 'xlsx';

export const ordenarSemanas = (listaSemanas) => {
  return [...listaSemanas].sort((a, b) => {
    const parseDate = (dateStr) => {
      if (!dateStr) return 0;
      const [day, month, year] = dateStr.split('/');
      return new Date(year, month - 1, day).getTime();
    };
    return parseDate(a.inicio) - parseDate(b.inicio);
  });
};

export const notificarGuardado = (mensajeOnline = null) => {
  if (!navigator.onLine) {
    alert('⚠️ Cambios guardados localmente. Espere a que se restablezca la conexión a internet antes de cerrar la página para que se sincronicen con la base de datos.');
  } else if (mensajeOnline) {
    alert(mensajeOnline);
  }
};

export const generarSemanasPorAnio = (anioNum, semanasGuardadas = []) => {
  const anio = parseInt(anioNum, 10);
  const semanasAnio = [];
  // Encontrar el primer lunes del año
  let fecha = new Date(anio, 0, 1);
  while (fecha.getDay() !== 1) {
    fecha.setDate(fecha.getDate() + 1);
  }
  let numSemana = 1;
  while (fecha.getFullYear() <= anio && numSemana <= 53) {
    const inicio = new Date(fecha);
    const fin = new Date(fecha);
    fin.setDate(fin.getDate() + 6);
    const formatoFecha = (f) => f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const inicioStr = formatoFecha(inicio);
    const finStr = formatoFecha(fin);
    const key = `${inicioStr}-${finStr}`;
    // Solo agregar si no existe ya en las semanas cargadas
    const yaExiste = semanasGuardadas.some(s => s.key === key);
    semanasAnio.push({
      inicio: inicioStr,
      fin: finStr,
      key,
      numSemana,
      yaExiste
    });
    fecha.setDate(fecha.getDate() + 7);
    numSemana++;
  }
  return semanasAnio;
};

export function generarSemanas2025() {
  const semanas = [];
  let fechaInicio = new Date(2025, 0, 1);
  const fechaFin = new Date(2025, 11, 31);

  while (fechaInicio <= fechaFin) {
    const inicioSemana = new Date(fechaInicio);
    const finSemana = new Date(fechaInicio);
    finSemana.setDate(finSemana.getDate() + 6);

    const formatoFecha = (fecha) => {
      return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    semanas.push({
      inicio: formatoFecha(inicioSemana),
      fin: formatoFecha(finSemana),
      key: `${formatoFecha(inicioSemana)}-${formatoFecha(finSemana)}`
    });
    fechaInicio.setDate(fechaInicio.getDate() + 7);
  }
  return semanas;
}

export const obtenerTotalesSemana = (proveedor, semanaKey) => {
  const registroSemana = proveedor.registroDiario?.[semanaKey] || {};
  let montoTotal = 0;
  let pagadoTotal = 0;

  // Sumar montos de los días incluyendo impuestos y retenciones
  Object.values(registroSemana).forEach(dia => {
    const registrosDia = Array.isArray(dia) ? dia : [dia];

    registrosDia.forEach(d => {
      const base = parseFloat(d.monto) || 0;
      const sign = base < 0 ? -1 : 1;
      const absBase = Math.abs(base);
      let absIva16 = 0, absIva8 = 0;
      if (d.tasaIva === 'Manual') {
        absIva16 = Math.abs(parseFloat(d.ivaManual) || 0);
      } else {
        absIva16 = Math.abs(parseFloat(d.iva16) || 0);
        absIva8 = Math.abs(parseFloat(d.iva8) || 0);
      }
      const absRetencion = Math.abs(parseFloat(d.retencion) || 0);
      const absRetencionIva = Math.abs(parseFloat(d.retencionIva) || 0);

      const totalDocumentoNeto = (absBase + absIva16 + absIva8) - absRetencion - absRetencionIva;

      if (d.tipoDocumento === 'Pago') {
        pagadoTotal += totalDocumentoNeto;
      } else {
        montoTotal += (totalDocumentoNeto * sign);
        pagadoTotal += parseFloat(d.pagado) || 0;
      }
    });
  });

  // Mantener compatibilidad con el sistema anterior si no hay registros diarios aún
  if (montoTotal === 0 && pagadoTotal === 0) {
    const deudaAntigua = proveedor.deudas?.find(d => d.semana === semanaKey);
    if (deudaAntigua) {
      montoTotal = parseFloat(deudaAntigua.monto) || 0;
      pagadoTotal = parseFloat(deudaAntigua.pagado) || 0;
    }
  }

  return { monto: montoTotal, pagado: pagadoTotal, saldo: Math.max(0, montoTotal - pagadoTotal) };
};

export const calcularTotalProveedor = (proveedor, semanas) => {
  return semanas.reduce((total, semana) => total + obtenerTotalesSemana(proveedor, semana.key).monto, 0);
};

export const calcularTotalPagado = (proveedor, semanas) => {
  return semanas.reduce((total, semana) => total + obtenerTotalesSemana(proveedor, semana.key).pagado, 0);
};

export const calcularSaldoPendienteProveedor = (proveedor, semanas) => {
  return Math.max(0, calcularTotalProveedor(proveedor, semanas) - calcularTotalPagado(proveedor, semanas));
};

export const calcularSaldoPendienteGeneral = (proveedoresFiltrados, semanas) => {
  return proveedoresFiltrados.reduce((total, p) => total + calcularSaldoPendienteProveedor(p, semanas), 0);
};

export const descargarReporteAnualExcel = (proveedores, semanas) => {
  // Hoja 1: Resumen
  const headersResumen = ['Proveedor', 'RIF', 'Encargado', 'Deuda Total Anual', 'Total Pagado Anual', 'Saldo Anual Pendiente'];
  const filasResumen = proveedores.map(p => {
    let deudaAnual = 0;
    let pagadoAnual = 0;
    semanas.forEach(semana => {
      const totales = obtenerTotalesSemana(p, semana.key);
      deudaAnual += totales.monto;
      pagadoAnual += totales.pagado;
    });
    return {
      'Proveedor': p.nombre,
      'RIF': p.rif || '-',
      'Encargado': p.encargado || '-',
      'Deuda Total Anual': deudaAnual,
      'Total Pagado Anual': pagadoAnual,
      'Saldo Anual Pendiente': Math.max(0, deudaAnual - pagadoAnual)
    };
  });

  // Hoja 2: Histórico (por proveedor)
  const headersHistorico = [
    'Proveedor', 'Fecha', 'Tipo de Documento', 'Nro Referencia',
    'Monto Base', 'IVA 16%', 'IVA 8%', 'Ret. Municipal', 'Ret. IVA', '% Ret. IVA', 'Total Bruto',
    'Pagado', 'Saldo Acumulado', 'Referencia/Pago', 'Observaciones'
  ];
  const filasHistorico = [];

  // Ordenar por proveedor
  const proveedoresOrdenados = [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre));

  proveedoresOrdenados.forEach(p => {
    let todasLasTransacciones = [];
    semanas.forEach(semana => {
      const registroSemana = p.registroDiario?.[semana.key] || {};
      
      Object.entries(registroSemana).forEach(([dk, diaData]) => {
        if (diaData) {
          const registrosDia = Array.isArray(diaData) ? diaData : [diaData];
          registrosDia.forEach(dData => {
            if (((parseFloat(dData.monto) || 0) !== 0 || (parseFloat(dData.pagado) || 0) !== 0)) {
              todasLasTransacciones.push({ ...dData, dk });
            }
          });
        }
      });
    });

    todasLasTransacciones.sort((a, b) => {
      const fechaA = new Date((a.fechaOperacion || a.dk) + 'T00:00:00');
      const fechaB = new Date((b.fechaOperacion || b.dk) + 'T00:00:00');
      return fechaA - fechaB;
    });

    let saldoAcumulado = 0;
    todasLasTransacciones.forEach(dData => {
      const base = parseFloat(dData.monto) || 0;
      const sign = base < 0 ? -1 : 1;
      const absBase = Math.abs(base);

      let absIva16 = 0, absIva8 = 0;
      if (dData.tasaIva === 'Manual') {
        absIva16 = Math.abs(parseFloat(dData.ivaManual) || 0);
      } else {
        absIva16 = Math.abs(parseFloat(dData.iva16) || 0);
        absIva8 = Math.abs(parseFloat(dData.iva8) || 0);
      }

      const absRet = Math.abs(parseFloat(dData.retencion) || 0);
      const absRetIva = Math.abs(parseFloat(dData.retencionIva) || 0);
      
      let totalNeto = ((absBase + absIva16 + absIva8) - absRet - absRetIva) * sign;
      let pagado = parseFloat(dData.pagado) || 0;

      if (dData.tipoDocumento === 'Pago') {
        pagado = Math.abs(totalNeto);
        totalNeto = 0;
      }

      saldoAcumulado = saldoAcumulado + totalNeto - pagado;
      const saldoMostrar = Math.max(0, saldoAcumulado);

      filasHistorico.push({
        'Proveedor': p.nombre,
        'Fecha': dData.fechaOperacion || dData.dk,
        'Tipo de Documento': dData.tipoDocumento || 'Factura',
        'Nro Referencia': dData.numeroFactura || '-',
        'Monto Base': dData.tipoDocumento === 'Pago' ? 0 : base,
        'IVA 16%': dData.tipoDocumento === 'Pago' ? 0 : (absIva16 * sign),
        'IVA 8%': dData.tipoDocumento === 'Pago' ? 0 : (absIva8 * sign),
        'Ret. Municipal': dData.tipoDocumento === 'Pago' ? 0 : (absRet * sign),
        'Ret. IVA': dData.tipoDocumento === 'Pago' ? 0 : (absRetIva * sign),
        '% Ret. IVA': dData.aplicaRetencionIva === false ? 'No' : (dData.porcentajeRetencionIva || '75') + '%',
        'Total Bruto': totalNeto,
        'Pagado': pagado,
        'Saldo Acumulado': saldoMostrar,
        'Referencia/Pago': dData.referencia || '-',
        'Observaciones': dData.observaciones || ''
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const wsResumen = XLSX.utils.json_to_sheet(filasResumen, { header: headersResumen });
  const wsHistorico = XLSX.utils.json_to_sheet(filasHistorico, { header: headersHistorico });

  // Aplicar formato de contabilidad
  const formatSheet = (ws) => {
    if (!ws || !ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellStr = XLSX.utils.encode_cell({c: C, r: R});
        if (ws[cellStr] && typeof ws[cellStr].v === 'number') {
          ws[cellStr].z = '#,##0.00';
        }
      }
    }
  };
  formatSheet(wsResumen);
  formatSheet(wsHistorico);

  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
  XLSX.utils.book_append_sheet(wb, wsHistorico, "Histórico");

  XLSX.writeFile(wb, "Reporte_Anual_Consolidado_2025.xlsx");
};

export const descargarReporteProveedorCSV = (p, semanas) => {
  const headers = [
    'Fecha', 'Tipo de Documento', 'Nro Referencia',
    'Monto Base', 'IVA 16%', 'IVA 8%', 'Ret. Municipal', 'Ret. IVA', '% Ret. IVA', 'Total Bruto',
    'Pagado', 'Saldo Acumulado', 'Referencia/Pago', 'Observaciones'
  ];

  let todasLasTransacciones = [];

  semanas.forEach(semana => {
    const registroSemana = p.registroDiario?.[semana.key] || {};

    Object.entries(registroSemana).forEach(([dk, diaData]) => {
      if (diaData) {
        const registrosDia = Array.isArray(diaData) ? diaData : [diaData];

        registrosDia.forEach(dData => {
          if (((parseFloat(dData.monto) || 0) !== 0 || (parseFloat(dData.pagado) || 0) !== 0)) {
            todasLasTransacciones.push({ ...dData, dk });
          }
        });
      }
    });
  });

  // Ordenar cronológicamente
  todasLasTransacciones.sort((a, b) => {
    const fechaA = new Date((a.fechaOperacion || a.dk) + 'T00:00:00');
    const fechaB = new Date((b.fechaOperacion || b.dk) + 'T00:00:00');
    return fechaA - fechaB;
  });

  const filasTransactions = [];
  let saldoAcumulado = 0;

  todasLasTransacciones.forEach(dData => {
    const base = parseFloat(dData.monto) || 0;
    const sign = base < 0 ? -1 : 1;
    const absBase = Math.abs(base);

    let absIva16 = 0, absIva8 = 0;
    if (dData.tasaIva === 'Manual') {
      absIva16 = Math.abs(parseFloat(dData.ivaManual) || 0);
    } else {
      absIva16 = Math.abs(parseFloat(dData.iva16) || 0);
      absIva8 = Math.abs(parseFloat(dData.iva8) || 0);
    }

    const absRet = Math.abs(parseFloat(dData.retencion) || 0);
    const absRetIva = Math.abs(parseFloat(dData.retencionIva) || 0);
    
    let totalNeto = ((absBase + absIva16 + absIva8) - absRet - absRetIva) * sign;
    let pagado = parseFloat(dData.pagado) || 0;

    if (dData.tipoDocumento === 'Pago') {
      pagado = Math.abs(totalNeto);
      totalNeto = 0;
    }

    saldoAcumulado = saldoAcumulado + totalNeto - pagado;
    const saldoMostrar = Math.max(0, saldoAcumulado);

    filasTransactions.push({
      'Fecha': dData.fechaOperacion || dData.dk,
      'Tipo de Documento': dData.tipoDocumento || 'Factura',
      'Nro Referencia': dData.numeroFactura || '-',
      'Monto Base': dData.tipoDocumento === 'Pago' ? 0 : base,
      'IVA 16%': dData.tipoDocumento === 'Pago' ? 0 : (absIva16 * sign),
      'IVA 8%': dData.tipoDocumento === 'Pago' ? 0 : (absIva8 * sign),
      'Ret. Municipal': dData.tipoDocumento === 'Pago' ? 0 : (absRet * sign),
      'Ret. IVA': dData.tipoDocumento === 'Pago' ? 0 : (absRetIva * sign),
      '% Ret. IVA': dData.aplicaRetencionIva === false ? 'No' : (dData.porcentajeRetencionIva || '75') + '%',
      'Total Bruto': totalNeto,
      'Pagado': pagado,
      'Saldo Acumulado': saldoMostrar,
      'Referencia/Pago': dData.referencia || '-',
      'Observaciones': dData.observaciones || ''
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(filasTransactions, { header: headers });

  // Aplicar formato de contabilidad a los números
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellStr = XLSX.utils.encode_cell({c: C, r: R});
        if (ws[cellStr] && typeof ws[cellStr].v === 'number') {
          ws[cellStr].z = '#,##0.00';
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Estado_de_Cuenta");
  XLSX.writeFile(wb, `Estado_Cuenta_${p.nombre.replace(/\s+/g, '_')}.xlsx`);
};
