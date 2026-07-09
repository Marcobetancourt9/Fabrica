import React, { useState, useEffect } from 'react';
import './FichaProveedor.css';

const TIPO_DOC_CONFIG = {
  'Factura':          { icon: '📄', color: '#3b82f6', label: 'Factura',          sumDeuda: true  },
  'Nota de Entrega':  { icon: '📦', color: '#8b5cf6', label: 'Nota de Entrega',  sumDeuda: true  },
  'Nota de Débito':   { icon: '📈', color: '#f59e0b', label: 'Nota de Débito',   sumDeuda: true  },
  'Nota de Crédito':  { icon: '📉', color: '#10b981', label: 'Nota de Crédito',  sumDeuda: false },
  'Pago':             { icon: '💰', color: '#06b6d4', label: 'Pago',             sumDeuda: false },
};

const TASA_IVA_CONFIG = {
  '16': { label: 'IVA 16%', color: '#f59e0b', icon: '🔶' },
  '8':  { label: 'IVA 8%',  color: '#8b5cf6', icon: '🔷' },
  '0':  { label: 'Exento',  color: '#6b7280', icon: '⚪' },
  'Manual': { label: 'Manual', color: '#ec4899', icon: '📝' }
};

const FichaProveedor = ({ 
  proveedor, 
  semanas, 
  semanaAbiertaInicial, 
  onClose, 
  onSave,
  puedeEditar = true
}) => {
  const [datosDetalle, setDatosDetalle] = useState({
    rif: proveedor.rif || '',
    encargado: proveedor.encargado || '',
    registroDiario: proveedor.registroDiario || {}
  });

  const [fechaActiva, setFechaActiva] = useState(new Date().toISOString().split('T')[0]);
  const [tabActivo, setTabActivo] = useState('diario'); // 'diario' o 'historial'
  const [mesHistorial, setMesHistorial] = useState(new Date().getMonth() + 1); // 1-12

  const esDocumentoResta = (tipo) => tipo === 'Nota de Crédito' || tipo === 'Pago';

  // Utils
  const obtenerSemanaKeyDeFecha = (fechaStr) => {
    const f = new Date(fechaStr + 'T00:00:00');
    for (let s of semanas) {
      const [d1, m1, a1] = s.inicio.split('/').map(Number);
      const [d2, m2, a2] = s.fin.split('/').map(Number);
      const fInicio = new Date(a1, m1 - 1, d1);
      const fFin = new Date(a2, m2 - 1, d2);
      fFin.setHours(23, 59, 59);
      if (f >= fInicio && f <= fFin) {
        return s.key;
      }
    }
    return null; 
  };

  const recalcularCamposDerivados = (registroDia) => {
    const montoNum = parseFloat(registroDia.monto) || 0;
    const tasa = registroDia.tasaIva || '16';

    if (tasa === '16') {
      registroDia.iva16 = (montoNum * 0.16).toFixed(2);
      registroDia.iva8 = '0';
    } else if (tasa === '8') {
      registroDia.iva16 = '0';
      registroDia.iva8 = (montoNum * 0.08).toFixed(2);
    } else if (tasa === 'Manual') {
      registroDia.iva16 = '0';
      registroDia.iva8 = '0';
    } else {
      registroDia.iva16 = '0';
      registroDia.iva8 = '0';
    }

    if (registroDia.aplicaRetencionMunicipal === false) {
      registroDia.retencion = '0';
    } else {
      registroDia.retencion = (Math.abs(montoNum) * 0.0125).toFixed(2);
    }

    const montoIva = parseFloat(tasa === '16' ? registroDia.iva16 : (tasa === '8' ? registroDia.iva8 : (tasa === 'Manual' ? registroDia.ivaManual : '0'))) || 0;
    const pctRetencionIva = registroDia.porcentajeRetencionIva || '75';
    if (tasa === '0' || registroDia.aplicaRetencionIva === false) {
      registroDia.retencionIva = '0';
    } else {
      registroDia.retencionIva = (Math.abs(montoIva) * (parseFloat(pctRetencionIva) / 100)).toFixed(2);
    }
    return registroDia;
  };

  const getDocumentosDia = (fecha) => {
    const semanaKey = obtenerSemanaKeyDeFecha(fecha);
    if (!semanaKey) return [];
    const data = datosDetalle.registroDiario[semanaKey]?.[fecha];
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [{ id: 'legacy-' + fecha, ...data }];
  };

  const calcularTotalRegistro = (dData) => {
    const monto = parseFloat(dData.monto) || 0;
    const iva = dData.tasaIva === 'Manual'
                ? (parseFloat(dData.ivaManual) || 0)
                : (parseFloat(dData.iva16) || 0) + (parseFloat(dData.iva8) || 0);
    const retMunicipal = parseFloat(dData.retencion) || 0;
    const retIva = parseFloat(dData.retencionIva) || 0;
    return (Math.abs(monto) + Math.abs(iva)) - retMunicipal - retIva;
  };

  // Acciones
  const crearDocumento = (tipoDoc) => {
    const semanaKey = obtenerSemanaKeyDeFecha(fechaActiva);
    if (!semanaKey) return alert("Fecha fuera de rango. Seleccione una fecha válida en las semanas configuradas.");
    
    const nuevoRegistro = { ...datosDetalle.registroDiario };
    if (!nuevoRegistro[semanaKey]) nuevoRegistro[semanaKey] = {};
    
    let arr = nuevoRegistro[semanaKey][fechaActiva];
    if (!arr) arr = [];
    if (!Array.isArray(arr)) arr = [{ id: 'legacy-' + fechaActiva, ...arr }];

    const esResta = tipoDoc === 'Pago' || tipoDoc === 'Nota de Crédito';
    const newDoc = {
      id: Date.now().toString(),
      tipoDocumento: tipoDoc,
      fechaOperacion: fechaActiva,
      monto: '',
      pagado: '',
      ivaManual: '',
      tasaIva: tipoDoc === 'Pago' ? '0' : '16', // Por defecto los pagos son exentos
      porcentajeRetencionIva: '75',
      aplicaRetencionMunicipal: esResta ? false : true,
      aplicaRetencionIva: esResta ? false : true
    };
    
    // Lo guardamos ya pre-calculado
    recalcularCamposDerivados(newDoc);

    arr.unshift(newDoc); // Agregamos al inicio
    nuevoRegistro[semanaKey][fechaActiva] = arr;
    
    setDatosDetalle({ ...datosDetalle, registroDiario: nuevoRegistro });
  };

  const eliminarDocumento = (docId) => {
    if(!window.confirm('¿Seguro que desea eliminar este documento? Esta acción es irreversible tras guardar.')) return;
    const semanaKey = obtenerSemanaKeyDeFecha(fechaActiva);
    const nuevoRegistro = { ...datosDetalle.registroDiario };
    let arr = nuevoRegistro[semanaKey][fechaActiva];
    if (!Array.isArray(arr)) arr = [{ id: 'legacy-' + fechaActiva, ...arr }];
    
    nuevoRegistro[semanaKey][fechaActiva] = arr.filter(d => (d.id || 'legacy-'+fechaActiva) !== docId);
    setDatosDetalle({ ...datosDetalle, registroDiario: nuevoRegistro });
  };

  const manejarCambioDoc = (docId, campo, valor) => {
    const semanaKey = obtenerSemanaKeyDeFecha(fechaActiva);
    const nuevoRegistro = { ...datosDetalle.registroDiario };
    let arr = nuevoRegistro[semanaKey][fechaActiva];
    if (!Array.isArray(arr)) arr = [{ id: 'legacy-' + fechaActiva, ...arr }];
    
    const newArr = arr.map(doc => {
       const currId = doc.id || 'legacy-'+fechaActiva;
       if (currId === docId) {
          const updated = { ...doc };
          let nuevoValor = valor;

          if (campo === 'tipoDocumento') {
            const esResta = esDocumentoResta(valor);
            if (updated.monto) {
              const valAbs = Math.abs(parseFloat(updated.monto) || 0);
              updated.monto = (esResta ? -valAbs : valAbs).toString();
            }
          }

          if (campo === 'monto') {
            const tipo = updated.tipoDocumento || 'Factura';
            const esResta = esDocumentoResta(tipo);
            if (valor !== '') {
              const valAbs = Math.abs(parseFloat(valor) || 0);
              const signVal = esResta ? -valAbs : valAbs;
              nuevoValor = isNaN(signVal) ? valor : signVal.toString();
            }
          }

          updated[campo] = nuevoValor;
          return recalcularCamposDerivados(updated);
       }
       return doc;
    });
    
    nuevoRegistro[semanaKey][fechaActiva] = newArr;
    setDatosDetalle({ ...datosDetalle, registroDiario: nuevoRegistro });
  };

  const cambiarDia = (dias) => {
    const f = new Date(fechaActiva + 'T00:00:00');
    f.setDate(f.getDate() + dias);
    setFechaActiva(f.toISOString().split('T')[0]);
  };

  // Historial y Totales Generales
  const getTodosLosDocumentos = () => {
    const allDocs = [];
    Object.values(datosDetalle.registroDiario).forEach(semana => {
      Object.entries(semana).forEach(([diaKey, diaData]) => {
         const arr = Array.isArray(diaData) ? diaData : [{ id: 'legacy-'+diaKey, ...diaData }];
         arr.forEach(doc => {
            if ((parseFloat(doc.monto) || 0) !== 0 || (parseFloat(doc.pagado) || 0) !== 0) {
              allDocs.push({ ...doc, diaKey });
            }
         });
      });
    });
    return allDocs.sort((a,b) => b.diaKey.localeCompare(a.diaKey));
  };

  const docsMes = getTodosLosDocumentos().filter(d => {
    const [y, m] = d.diaKey.split('-');
    return parseInt(m) === mesHistorial;
  });

  const totalesGenerales = getTodosLosDocumentos().reduce((acc, doc) => {
    const base = parseFloat(doc.monto) || 0;
    const sign = base < 0 ? -1 : 1;
    const iva = doc.tasaIva === 'Manual'
                ? (parseFloat(doc.ivaManual) || 0)
                : (parseFloat(doc.iva16) || 0) + (parseFloat(doc.iva8) || 0);
    const neto = ((Math.abs(base) + Math.abs(iva)) 
                 - Math.abs(parseFloat(doc.retencion) || 0) - Math.abs(parseFloat(doc.retencionIva) || 0)) * sign;
    acc.deuda += neto;
    acc.pagado += parseFloat(doc.pagado) || 0;
    return acc;
  }, { deuda: 0, pagado: 0 });

  const docsHoy = getDocumentosDia(fechaActiva);
  const totalesHoy = docsHoy.reduce((acc, doc) => {
    const base = parseFloat(doc.monto) || 0;
    const sign = base < 0 ? -1 : 1;
    const neto = calcularTotalRegistro(doc) * sign;
    acc.neto += neto;
    if (sign > 0) acc.sumas += neto;
    else acc.restas += Math.abs(neto);
    return acc;
  }, { neto: 0, sumas: 0, restas: 0 });

  return (
    <div className="ficha-overlay">
      <div className="ficha-full-card">
        <header className="ficha-header">
          <div className="header-info">
            <span className="subtitle">Gestión de Cuentas por Pagar</span>
            <h1>Ficha de Proveedor: {proveedor.nombre}</h1>
          </div>
          <button className="btn-close-full" onClick={onClose}>
            ✕ <span>Cerrar</span>
          </button>
        </header>

        <main className="ficha-content new-layout">
          <aside className="ficha-sidebar">
            <section className="info-general-panel">
              <h3>Datos Fiscales</h3>
              <div className="input-field-full">
                <label>RIF / Identificación</label>
                <input type="text" value={datosDetalle.rif} onChange={(e) => setDatosDetalle({...datosDetalle, rif: e.target.value})} placeholder="J-00000000-0" disabled={!puedeEditar} />
              </div>
              <div className="input-field-full">
                <label>Persona Encargada</label>
                <input type="text" value={datosDetalle.encargado} onChange={(e) => setDatosDetalle({...datosDetalle, encargado: e.target.value})} placeholder="Nombre de contacto" disabled={!puedeEditar} />
              </div>
            </section>

            <div className="resumen-proveedor-card">
              <h3>Saldo Global del Proveedor</h3>
              <div className="total-display">
                <div className="resumen-row">
                  <span>Deuda Bruta:</span>
                  <span className="val">${totalesGenerales.deuda.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="resumen-row">
                  <span>Pagado:</span>
                  <span className="val green">${totalesGenerales.pagado.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="resumen-row total">
                  <span>Saldo deudor:</span>
                  <span className="val highlight">${(Math.max(0, totalesGenerales.deuda - totalesGenerales.pagado)).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>
          </aside>

          <section className="ficha-main-area">
            {/* ─── Pestañas Principales ─── */}
            <div className="tabs-container">
              <button className={`tab-btn ${tabActivo === 'diario' ? 'active' : ''}`} onClick={() => setTabActivo('diario')}>
                Registro Diario
              </button>
              <button className={`tab-btn ${tabActivo === 'historial' ? 'active' : ''}`} onClick={() => setTabActivo('historial')}>
                Historial Mensual
              </button>
            </div>

            {tabActivo === 'diario' && (
              <div className="tab-content diario-view">
                {/* Selector de Fecha Central */}
                <div className="date-navigator">
                  <button onClick={() => cambiarDia(-1)} className="nav-btn">◀ Anterior</button>
                  <div className="date-picker-wrapper">
                    <label>Fecha Activa</label>
                    <input type="date" value={fechaActiva} onChange={(e) => setFechaActiva(e.target.value)} className="date-main-input" />
                  </div>
                  <button onClick={() => cambiarDia(1)} className="nav-btn">Siguiente ▶</button>
                </div>

                {/* Menú de Operaciones Maestras */}
                {puedeEditar && (
                  <div className="operations-menu-card">
                    <h3>Registrar Operación en el Día</h3>
                    <div className="operations-buttons">
                      {Object.entries(TIPO_DOC_CONFIG).map(([key, cfg]) => (
                        <button key={key} className="op-btn" style={{ '--op-color': cfg.color }} onClick={() => crearDocumento(key)}>
                          <span className="op-icon">{cfg.icon}</span>
                          <span className="op-label">{cfg.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumen del Día Actual */}
                <div className="day-summary-card">
                  <h3>Balance del Día: {fechaActiva.split('-').reverse().join('/')}</h3>
                  <div className="day-stats">
                    <div className="stat suma"><span>Suma Deuda:</span> <strong>+${totalesHoy.sumas.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></div>
                    <div className="stat resta"><span>Resta Deuda:</span> <strong>-${totalesHoy.restas.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></div>
                    <div className={`stat total ${totalesHoy.neto < 0 ? 'neg' : 'pos'}`}>
                      <span>Neto Diario:</span>
                      <strong>{totalesHoy.neto > 0 ? '+' : ''}${totalesHoy.neto.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
                    </div>
                  </div>
                </div>

                {/* Lista de Documentos del Día */}
                <div className="documents-list">
                  {docsHoy.length === 0 ? (
                    <div className="empty-day-state">
                      <span className="empty-icon">📭</span>
                      <p>No hay operaciones registradas para esta fecha.</p>
                      <span>Usa los botones de arriba para crear una factura, pago o nota.</span>
                    </div>
                  ) : (
                    docsHoy.map((dData, index) => {
                      const docId = dData.id || 'legacy-'+fechaActiva;
                      const tipoDoc = dData.tipoDocumento || 'Factura';
                      const tipoCfg = TIPO_DOC_CONFIG[tipoDoc] || TIPO_DOC_CONFIG['Factura'];
                      const esResta = esDocumentoResta(tipoDoc);
                      const tasaActual = dData.tasaIva || '16';
                      const tasaCfg = TASA_IVA_CONFIG[tasaActual] || TASA_IVA_CONFIG['16'];

                      return (
                        <div key={docId} className="document-card" style={{ '--doc-accent': tipoCfg.color }}>
                          <div className="document-card-header">
                            <div className="doc-title">
                              <span className="doc-icon">{tipoCfg.icon}</span>
                              <h4>{tipoDoc}</h4>
                              <span className={`doc-effect ${esResta ? 'resta' : 'suma'}`}>{esResta ? 'Resta Deuda' : 'Suma Deuda'}</span>
                            </div>
                            {puedeEditar && (
                              <button className="btn-delete-doc" onClick={() => eliminarDocumento(docId)}>🗑️ Eliminar</button>
                            )}
                          </div>

                          <div className="document-card-body">
                            <div className={`form-grid-${tipoDoc === 'Pago' ? '2' : '3'}`}>
                              <div className="f-field">
                                <label>{tipoDoc === 'Pago' ? 'Número de Referencia' : 'Número de Control'}</label>
                                <input type="text" value={dData.numeroFactura || ''} onChange={(e) => manejarCambioDoc(docId, 'numeroFactura', e.target.value)} placeholder={tipoDoc === 'Pago' ? 'Efectivo, Transferencia...' : '0001'} disabled={!puedeEditar} />
                              </div>
                              <div className="f-field">
                                <label>Monto Base {esResta && '(Se aplicará negativo)'}</label>
                                <div className="input-with-sign">
                                  <span className={`sign-indicator ${esResta ? 'negative' : 'positive'}`}>{esResta ? '−' : '+'}</span>
                                  <input 
                                    type="number" 
                                    value={dData.monto ? Math.abs(parseFloat(dData.monto)).toString() : ''} 
                                    onChange={(e) => manejarCambioDoc(docId, 'monto', e.target.value)} 
                                    placeholder="0.00" 
                                    className={esResta ? 'input-resta' : ''}
                                    disabled={!puedeEditar}
                                  />
                                </div>
                              </div>
                              {tipoDoc !== 'Pago' && (
                                <div className="f-field">
                                  <label>Pagado</label>
                                  <input type="number" value={dData.pagado || ''} onChange={(e) => manejarCambioDoc(docId, 'pagado', e.target.value)} placeholder="0.00" disabled={!puedeEditar} />
                                </div>
                              )}
                            </div>

                            {tipoDoc !== 'Pago' && (
                              <div className="form-grid-3">
                                {/* ─── Selector de IVA ─── */}
                                <div className="f-field iva-field">
                                  <label>Tasa de IVA</label>
                                  <div className="iva-selector">
                                    {Object.entries(TASA_IVA_CONFIG).map(([key, cfg]) => (
                                      <button
                                        key={key}
                                        type="button"
                                        disabled={!puedeEditar}
                                        className={`iva-option ${tasaActual === key ? 'selected' : ''}`}
                                        style={{ '--iva-color': cfg.color }}
                                        onClick={() => manejarCambioDoc(docId, 'tasaIva', key)}
                                      >
                                        <span className="iva-icon">{cfg.icon}</span>
                                        <span className="iva-label">{cfg.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {/* ─── Ret. Municipal auto-calculada (1.25%) ─── */}
                                <div className="f-field calc">
                                  <label>
                                    Ret. Municipal (1,25%)
                                    <label className="toggle-switch-small">
                                      <input 
                                        type="checkbox" 
                                        checked={dData.aplicaRetencionMunicipal !== false} 
                                        onChange={(e) => manejarCambioDoc(docId, 'aplicaRetencionMunicipal', e.target.checked)}
                                        disabled={!puedeEditar}
                                      />
                                      <span className="slider-small round"></span>
                                    </label>
                                  </label>
                                  <div className={`auto-calc-display ret-municipal ${dData.aplicaRetencionMunicipal === false ? 'disabled' : ''}`}>
                                    <span className="auto-calc-icon">🏛️</span>
                                    <span className="auto-calc-value">${parseFloat(dData.retencion || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    <span className="auto-calc-label">{dData.aplicaRetencionMunicipal === false ? 'Desactivado' : 'Auto'}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {tipoDoc !== 'Pago' && (
                              <div className={`form-grid-${tasaActual !== '0' ? '2' : '2'}`}>
                                {tasaActual === 'Manual' ? (
                                  <div className="f-field">
                                    <label>Monto IVA Manual</label>
                                    <div className="input-with-sign">
                                      <input
                                        type="number"
                                        value={dData.ivaManual || ''}
                                        onChange={(e) => manejarCambioDoc(docId, 'ivaManual', e.target.value)}
                                        placeholder="0.00"
                                        disabled={!puedeEditar}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="f-field calc">
                                    <label>Monto IVA (Auto-calculado)</label>
                                    <div className="iva-result" style={{ '--iva-result-color': tasaCfg.color }}>
                                      <span className="iva-result-icon">{tasaCfg.icon}</span>
                                      <span className="iva-result-value">
                                        {tasaActual === '16' ? `$${dData.iva16 || '0.00'}` : (tasaActual === '8' ? `$${dData.iva8 || '0.00'}` : '$0.00')}
                                      </span>
                                      <span className="iva-result-label">{tasaCfg.label}</span>
                                    </div>
                                  </div>
                                )}

                              {/* ─── Retención de IVA ─── */}
                              {tasaActual !== '0' && (
                                <div className="f-field calc retencion-iva-field">
                                  <label>
                                    Retención de IVA
                                    <label className="toggle-switch-small">
                                      <input 
                                        type="checkbox" 
                                        checked={dData.aplicaRetencionIva !== false} 
                                        onChange={(e) => manejarCambioDoc(docId, 'aplicaRetencionIva', e.target.checked)}
                                        disabled={!puedeEditar}
                                      />
                                      <span className="slider-small round"></span>
                                    </label>
                                  </label>
                                  <div className={`retencion-iva-container ${dData.aplicaRetencionIva === false ? 'disabled' : ''}`}>
                                    <div className="retencion-pct-selector">
                                      <button
                                        type="button"
                                        disabled={!puedeEditar || dData.aplicaRetencionIva === false}
                                        className={`pct-option ${(dData.porcentajeRetencionIva || '75') === '75' ? 'selected' : ''}`}
                                        onClick={() => manejarCambioDoc(docId, 'porcentajeRetencionIva', '75')}
                                      >
                                        75%
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!puedeEditar || dData.aplicaRetencionIva === false}
                                        className={`pct-option ${(dData.porcentajeRetencionIva || '75') === '100' ? 'selected' : ''}`}
                                        onClick={() => manejarCambioDoc(docId, 'porcentajeRetencionIva', '100')}
                                      >
                                        100%
                                      </button>
                                    </div>
                                    <div className="auto-calc-display ret-iva">
                                      <span className="auto-calc-icon">🧾</span>
                                      <span className="auto-calc-value">${parseFloat(dData.retencionIva || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      <span className="auto-calc-label">{dData.aplicaRetencionIva === false ? 'Desactivado' : `${dData.porcentajeRetencionIva || '75'}% del IVA`}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            )}

                            {/* ─── Total del Registro (Neto) ─── */}
                            <div className="f-field total-dia-field">
                              <label>Total del Registro <span className="formula-hint">(Monto + IVA) − Ret. Municipal − Ret. IVA</span></label>
                              <div className={`total-dia-display ${esResta ? 'resta' : 'suma'}`}>
                                <span className="total-dia-sign">{esResta ? '−' : '+'}</span>
                                <span className="total-dia-value">
                                  ${calcularTotalRegistro(dData).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                <div className="total-breakdown">
                                  <span className="breakdown-item">Base: ${Math.abs(parseFloat(dData.monto) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  {tipoDoc !== 'Pago' && (
                                    <>
                                      <span className="breakdown-item">+ IVA: ${(dData.tasaIva === 'Manual' ? (parseFloat(dData.ivaManual) || 0) : (Math.abs(parseFloat(dData.iva16) || 0) + Math.abs(parseFloat(dData.iva8) || 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      <span className="breakdown-item subtract">− Ret.M: ${parseFloat(dData.retencion || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                      <span className="breakdown-item subtract">− Ret.IVA: ${parseFloat(dData.retencionIva || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className={`form-grid-${tipoDoc === 'Pago' ? '1' : '2'}`}>
                              {tipoDoc !== 'Pago' && (
                                <div className="f-field">
                                  <label>Referencia / Método de Pago</label>
                                  <input type="text" value={dData.referencia || ''} onChange={(e) => manejarCambioDoc(docId, 'referencia', e.target.value)} placeholder="Efectivo, Transferencia #0000, Pago Móvil..." disabled={!puedeEditar} />
                                </div>
                              )}
                              <div className="f-field">
                                <label>URL Soporte (Opcional)</label>
                                <input type="text" value={dData.facturaUrl || ''} onChange={(e) => manejarCambioDoc(docId, 'facturaUrl', e.target.value)} placeholder="https://..." disabled={!puedeEditar} />
                              </div>
                            </div>

                            <div className="f-field">
                              <label>Observaciones</label>
                              <textarea value={dData.observaciones || ''} onChange={(e) => manejarCambioDoc(docId, 'observaciones', e.target.value)} placeholder="Detalles adicionales sobre esta transacción..." className="observaciones-textarea" disabled={!puedeEditar} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {tabActivo === 'historial' && (
              <div className="tab-content historial-view">
                <div className="historial-header">
                  <h3>Historial de Operaciones</h3>
                  <div className="mes-selector">
                    <label>Mes:</label>
                    <select value={mesHistorial} onChange={(e) => setMesHistorial(Number(e.target.value))}>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <option key={m} value={m}>{new Date(2025, m-1, 1).toLocaleString('es', { month: 'long' }).toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="historial-table-container">
                  <table className="historial-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Nro Control</th>
                        <th>Total Neto</th>
                        <th>Pagado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docsMes.length === 0 ? (
                        <tr><td colSpan="5" className="text-center">No hay operaciones en este mes.</td></tr>
                      ) : (
                        docsMes.map((doc, idx) => {
                          const esResta = esDocumentoResta(doc.tipoDocumento);
                          const total = calcularTotalRegistro(doc);
                          return (
                            <tr key={idx}>
                              <td>{doc.fechaOperacion || doc.diaKey}</td>
                              <td>
                                <span className={`tipo-badge-table ${esResta ? 'resta' : 'suma'}`} style={{'--badge-color': (TIPO_DOC_CONFIG[doc.tipoDocumento] || TIPO_DOC_CONFIG['Factura']).color}}>
                                  {doc.tipoDocumento || 'Factura'}
                                </span>
                              </td>
                              <td>{doc.numeroFactura || '-'}</td>
                              <td className={`monto-col ${esResta ? 'neg' : 'pos'}`}>
                                {esResta ? '-' : '+'}${total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                              </td>
                              <td>${parseFloat(doc.pagado || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </main>

        <footer className="ficha-footer">
          <p className="footer-status">Los cambios se sincronizarán con la base de datos de Firebase.</p>
          <div className="f-actions">
            <button className="btn-secondary-full" onClick={onClose}>Cerrar</button>
            {puedeEditar && (
              <button className="btn-primary-full" onClick={() => onSave(datosDetalle)}>Guardar Cambios</button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default FichaProveedor;
