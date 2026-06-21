import React, { useState } from 'react';
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
};

const FichaProveedor = ({ 
  proveedor, 
  semanas, 
  semanaAbiertaInicial, 
  onClose, 
  onSave 
}) => {
  const [datosDetalle, setDatosDetalle] = useState({
    rif: proveedor.rif || '',
    encargado: proveedor.encargado || '',
    registroDiario: proveedor.registroDiario || {}
  });
  const [semanaAbierta, setSemanaAbierta] = useState(semanaAbiertaInicial);
  const [diaAbierto, setDiaAbierto] = useState(null);

  const esDocumentoResta = (tipo) => tipo === 'Nota de Crédito' || tipo === 'Pago';

  const obtenerTotalesSemana = (semanaKey) => {
    const registroSemana = datosDetalle.registroDiario[semanaKey] || {};
    let montoTotal = 0;
    let pagadoTotal = 0;
    
    Object.values(registroSemana).forEach(dia => {
      const base = parseFloat(dia.monto) || 0;
      const iva16 = parseFloat(dia.iva16) || 0;
      const iva8 = parseFloat(dia.iva8) || 0;
      const retencion = parseFloat(dia.retencion) || 0;
      montoTotal += (base + iva16 + iva8 + retencion);
      pagadoTotal += parseFloat(dia.pagado) || 0;
    });

    return { 
      monto: montoTotal, 
      pagado: pagadoTotal, 
      saldo: Math.max(0, montoTotal - pagadoTotal) 
    };
  };

  const obtenerDiasDeSemana = (semanaKey) => {
    const [inicioStr] = semanaKey.split('-');
    const [d, m, a] = inicioStr.split('/').map(Number);
    const fechaInicio = new Date(a, m - 1, d);
    
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fechaInicio.getDate() + i);
      const diaKey = fecha.toISOString().split('T')[0];
      const diaLabel = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
      dias.push({ key: diaKey, label: diaLabel });
    }
    return dias;
  };

  // Función auxiliar para calcular los campos derivados de un registro de día
  const recalcularCamposDerivados = (registroDia) => {
    const montoNum = parseFloat(registroDia.monto) || 0;
    const tasa = registroDia.tasaIva || '16';

    // Auto-cálculo de IVA según tasa seleccionada
    if (tasa === '16') {
      registroDia.iva16 = (montoNum * 0.16).toFixed(2);
      registroDia.iva8 = '0';
    } else if (tasa === '8') {
      registroDia.iva16 = '0';
      registroDia.iva8 = (montoNum * 0.08).toFixed(2);
    } else {
      registroDia.iva16 = '0';
      registroDia.iva8 = '0';
    }

    // Auto-cálculo de Retención Municipal (1.25% del monto base)
    registroDia.retencion = (Math.abs(montoNum) * 0.0125).toFixed(2);

    // Auto-cálculo de Retención de IVA
    const montoIva = parseFloat(tasa === '16' ? registroDia.iva16 : (tasa === '8' ? registroDia.iva8 : '0')) || 0;
    const pctRetencionIva = registroDia.porcentajeRetencionIva || '75';
    if (tasa === '0') {
      registroDia.retencionIva = '0';
    } else {
      registroDia.retencionIva = (Math.abs(montoIva) * (parseFloat(pctRetencionIva) / 100)).toFixed(2);
    }

    return registroDia;
  };

  const manejarCambioDiario = (semanaKey, diaKey, campo, valor) => {
    const nuevoRegistro = { ...datosDetalle.registroDiario };
    if (!nuevoRegistro[semanaKey]) nuevoRegistro[semanaKey] = {};
    if (!nuevoRegistro[semanaKey][diaKey]) nuevoRegistro[semanaKey][diaKey] = {};

    const registroDia = { ...nuevoRegistro[semanaKey][diaKey] };
    
    let nuevoValor = valor;

    // Si cambia el tipo de documento, ajustar el signo del monto existente
    if (campo === 'tipoDocumento') {
      const esResta = esDocumentoResta(valor);
      if (registroDia.monto) {
        const valAbs = Math.abs(parseFloat(registroDia.monto) || 0);
        registroDia.monto = (esResta ? -valAbs : valAbs).toString();
      }
    }

    // Si cambia el monto, forzar el signo según el tipo de documento actual
    if (campo === 'monto') {
      const tipo = registroDia.tipoDocumento || 'Factura';
      const esResta = esDocumentoResta(tipo);
      if (valor !== '') {
        const valAbs = Math.abs(parseFloat(valor) || 0);
        const signVal = esResta ? -valAbs : valAbs;
        nuevoValor = isNaN(signVal) ? valor : signVal.toString();
      }
    }

    registroDia[campo] = nuevoValor;

    // Recalcular todos los campos derivados (IVA, retenciones)
    recalcularCamposDerivados(registroDia);

    nuevoRegistro[semanaKey][diaKey] = registroDia;
    setDatosDetalle({ ...datosDetalle, registroDiario: nuevoRegistro });
  };

  // Función de cálculo para el Total del Registro neto
  // Total = (Monto + IVA) - Ret. Municipal - Retención de IVA
  const calcularTotalRegistro = (dData) => {
    const monto = parseFloat(dData.monto) || 0;
    const iva = (parseFloat(dData.iva16) || 0) + (parseFloat(dData.iva8) || 0);
    const retMunicipal = parseFloat(dData.retencion) || 0;
    const retIva = parseFloat(dData.retencionIva) || 0;
    return (Math.abs(monto) + Math.abs(iva)) - retMunicipal - retIva;
  };

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

        <main className="ficha-content">
          {/* Panel Lateral: Info General */}
          <aside className="ficha-sidebar">
            <section className="info-general-panel">
              <h3>Datos Fiscales</h3>
              <div className="input-field-full">
                <label>RIF / Identificación</label>
                <input 
                  type="text" 
                  value={datosDetalle.rif} 
                  onChange={(e) => setDatosDetalle({...datosDetalle, rif: e.target.value})}
                  placeholder="J-00000000-0"
                />
              </div>
              <div className="input-field-full">
                <label>Persona Encargada</label>
                <input 
                  type="text" 
                  value={datosDetalle.encargado} 
                  onChange={(e) => setDatosDetalle({...datosDetalle, encargado: e.target.value})}
                  placeholder="Nombre de contacto"
                />
              </div>
            </section>

            {/* Leyenda de tipos de documento */}
            <section className="tipos-doc-legend">
              <h3>Tipos de Documento</h3>
              <div className="legend-grid">
                {Object.entries(TIPO_DOC_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="legend-item" style={{ '--doc-color': cfg.color }}>
                    <span className="legend-icon">{cfg.icon}</span>
                    <div className="legend-info">
                      <span className="legend-name">{cfg.label}</span>
                      <span className={`legend-effect ${cfg.sumDeuda ? 'sum' : 'rest'}`}>
                        {cfg.sumDeuda ? '▲ Suma deuda' : '▼ Resta deuda'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="resumen-proveedor-card">
              <h3>Total Acumulado</h3>
              <div className="total-display">
                <div className="resumen-row">
                  <span>Deuda Bruta:</span>
                  <span className="val">${Object.keys(datosDetalle.registroDiario).reduce((acc, k) => acc + obtenerTotalesSemana(k).monto, 0).toLocaleString()}</span>
                </div>
                <div className="resumen-row">
                  <span>Pagado:</span>
                  <span className="val green">${Object.keys(datosDetalle.registroDiario).reduce((acc, k) => acc + obtenerTotalesSemana(k).pagado, 0).toLocaleString()}</span>
                </div>
                <div className="resumen-row total">
                  <span>Saldo deudor:</span>
                  <span className="val highlight">${(Object.keys(datosDetalle.registroDiario).reduce((acc, k) => acc + obtenerTotalesSemana(k).monto, 0) - Object.keys(datosDetalle.registroDiario).reduce((acc, k) => acc + obtenerTotalesSemana(k).pagado, 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Panel Principal: Registro Diario */}
          <section className="ficha-main-area">
            <div className="area-header">
              <h2>Historial de Registro Diario</h2>
              <p>Selecciona una semana para ver y editar los detalles específicos por día.</p>
            </div>

            <div className="semanas-grid">
              {semanas
                .filter(s => s.key === semanaAbierta || (obtenerTotalesSemana(s.key).monto !== 0))
                .map(semana => {
                  const isOpen = semanaAbierta === semana.key;
                  const totales = obtenerTotalesSemana(semana.key);

                  return (
                    <div key={semana.key} className={`week-full-section ${isOpen ? 'open' : ''}`}>
                      <div className="week-full-header" onClick={() => setSemanaAbierta(isOpen ? null : semana.key)}>
                        <div className="info">
                          <span className="icon">📅</span>
                          <strong>{semana.inicio} - {semana.fin}</strong>
                        </div>
                        <div className="badges">
                          <span className="b-monto">Deuda: ${totales.monto.toLocaleString()}</span>
                          <span className={`b-saldo ${totales.saldo > 0 ? 'red' : 'green'}`}>Pendiente: ${totales.saldo.toLocaleString()}</span>
                        </div>
                        <span className="arrow">{isOpen ? '▼' : '▶'}</span>
                      </div>

                      {isOpen && (
                        <div className="days-full-list">
                          {obtenerDiasDeSemana(semana.key).map(dia => {
                            const isDiaOpen = diaAbierto === dia.key;
                            const dData = datosDetalle.registroDiario[semana.key]?.[dia.key] || {};
                            const hasData = (parseFloat(dData.monto) || 0) !== 0;
                            const tipoDoc = dData.tipoDocumento || 'Factura';
                            const tipoCfg = TIPO_DOC_CONFIG[tipoDoc] || TIPO_DOC_CONFIG['Factura'];
                            const esResta = esDocumentoResta(tipoDoc);
                            const tasaActual = dData.tasaIva || '16';
                            const tasaCfg = TASA_IVA_CONFIG[tasaActual] || TASA_IVA_CONFIG['16'];

                            return (
                                <div key={dia.key} className={`day-full-entry ${isDiaOpen ? 'active' : ''} ${hasData ? 'has-data' : ''}`}
                                  style={hasData ? { '--entry-accent': tipoCfg.color } : {}}
                                >
                                  <div className="day-full-header" onClick={() => setDiaAbierto(isDiaOpen ? null : dia.key)}>
                                    <div className="day-header-left">
                                      <span className="name">{dia.label}</span>
                                      {hasData && (
                                        <span className="tipo-badge" style={{ '--badge-color': tipoCfg.color }}>
                                          {tipoCfg.icon} {tipoCfg.label}
                                        </span>
                                      )}
                                    </div>
                                    <div className="day-header-right">
                                      {hasData && (
                                        <span className={`m-total ${esResta ? 'resta' : ''}`}>
                                          {esResta ? '−' : '+'} ${calcularTotalRegistro(dData).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                      )}
                                      <button className="btn-edit-inline">{isDiaOpen ? 'Ocultar' : 'Editar'}</button>
                                    </div>
                                  </div>

                                  {isDiaOpen && (
                                    <div className="day-full-form">
                                      {/* ─── Selector Principal de Tipo de Documento ─── */}
                                      <div className="tipo-doc-selector">
                                        <label className="tipo-doc-label">Tipo de Documento</label>
                                        <div className="tipo-doc-cards">
                                          {Object.entries(TIPO_DOC_CONFIG).map(([key, cfg]) => (
                                            <button
                                              key={key}
                                              type="button"
                                              className={`tipo-doc-card ${tipoDoc === key ? 'selected' : ''}`}
                                              style={{ '--card-color': cfg.color }}
                                              onClick={() => manejarCambioDiario(semana.key, dia.key, 'tipoDocumento', key)}
                                            >
                                              <span className="card-icon">{cfg.icon}</span>
                                              <span className="card-name">{cfg.label}</span>
                                              <span className={`card-effect ${cfg.sumDeuda ? 'sum' : 'rest'}`}>
                                                {cfg.sumDeuda ? '▲ Deuda' : '▼ Deuda'}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Indicador visual del efecto */}
                                      <div className={`efecto-indicator ${esResta ? 'resta' : 'suma'}`}>
                                        <span className="efecto-icon">{esResta ? '📉' : '📈'}</span>
                                        <span className="efecto-text">
                                          {esResta 
                                            ? 'Este documento RESTA deuda — el monto se aplica como negativo' 
                                            : 'Este documento SUMA deuda — el monto se acumula al saldo'}
                                        </span>
                                      </div>

                                      <div className="form-grid-3">
                                        <div className="f-field">
                                          <label>Número de Factura/Control</label>
                                          <input type="text" value={dData.numeroFactura || ''} onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'numeroFactura', e.target.value)} placeholder="0001" />
                                        </div>
                                        <div className="f-field">
                                          <label>Fecha de Operación</label>
                                          <input type="date" value={dData.fechaOperacion || dia.key} onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'fechaOperacion', e.target.value)} />
                                        </div>
                                        <div className="f-field">
                                          <label>{esResta ? 'Monto a Descontar' : 'Monto Base'}</label>
                                          <div className="input-with-sign">
                                            <span className={`sign-indicator ${esResta ? 'negative' : 'positive'}`}>
                                              {esResta ? '−' : '+'}
                                            </span>
                                            <input 
                                              type="number" 
                                              value={dData.monto ? Math.abs(parseFloat(dData.monto)).toString() : ''} 
                                              onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'monto', e.target.value)} 
                                              placeholder="0.00" 
                                              className={esResta ? 'input-resta' : ''}
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="form-grid-3">
                                        <div className="f-field">
                                          <label>Pagado</label>
                                          <input type="number" value={dData.pagado || ''} onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'pagado', e.target.value)} placeholder="0.00" />
                                        </div>
                                        {/* ─── Selector de IVA con diseño premium ─── */}
                                        <div className="f-field iva-field">
                                          <label>Tasa de IVA</label>
                                          <div className="iva-selector">
                                            {Object.entries(TASA_IVA_CONFIG).map(([key, cfg]) => (
                                              <button
                                                key={key}
                                                type="button"
                                                className={`iva-option ${tasaActual === key ? 'selected' : ''}`}
                                                style={{ '--iva-color': cfg.color }}
                                                onClick={() => manejarCambioDiario(semana.key, dia.key, 'tasaIva', key)}
                                              >
                                                <span className="iva-icon">{cfg.icon}</span>
                                                <span className="iva-label">{cfg.label}</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                        {/* ─── Ret. Municipal auto-calculada (1.25%) ─── */}
                                        <div className="f-field calc">
                                          <label>Ret. Municipal (1,25%)</label>
                                          <div className="auto-calc-display ret-municipal">
                                            <span className="auto-calc-icon">🏛️</span>
                                            <span className="auto-calc-value">${parseFloat(dData.retencion || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <span className="auto-calc-label">Auto</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className={`form-grid-${tasaActual !== '0' ? '2' : '2'}`}>
                                        <div className="f-field calc">
                                          <label>Monto IVA (Auto-calculado)</label>
                                          <div className="iva-result" style={{ '--iva-result-color': tasaCfg.color }}>
                                            <span className="iva-result-icon">{tasaCfg.icon}</span>
                                            <span className="iva-result-value">
                                              {tasaActual === '16' 
                                                ? `$${dData.iva16 || '0.00'}` 
                                                : (tasaActual === '8' 
                                                  ? `$${dData.iva8 || '0.00'}` 
                                                  : '$0.00')}
                                            </span>
                                            <span className="iva-result-label">{tasaCfg.label}</span>
                                          </div>
                                        </div>

                                        {/* ─── Retención de IVA (solo si IVA no es Exento) ─── */}
                                        {tasaActual !== '0' && (
                                          <div className="f-field calc retencion-iva-field">
                                            <label>Retención de IVA</label>
                                            <div className="retencion-iva-container">
                                              <div className="retencion-pct-selector">
                                                <button
                                                  type="button"
                                                  className={`pct-option ${(dData.porcentajeRetencionIva || '75') === '75' ? 'selected' : ''}`}
                                                  onClick={() => manejarCambioDiario(semana.key, dia.key, 'porcentajeRetencionIva', '75')}
                                                >
                                                  75%
                                                </button>
                                                <button
                                                  type="button"
                                                  className={`pct-option ${(dData.porcentajeRetencionIva || '75') === '100' ? 'selected' : ''}`}
                                                  onClick={() => manejarCambioDiario(semana.key, dia.key, 'porcentajeRetencionIva', '100')}
                                                >
                                                  100%
                                                </button>
                                              </div>
                                              <div className="auto-calc-display ret-iva">
                                                <span className="auto-calc-icon">🧾</span>
                                                <span className="auto-calc-value">${parseFloat(dData.retencionIva || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                <span className="auto-calc-label">{dData.porcentajeRetencionIva || '75'}% del IVA</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

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
                                            <span className="breakdown-item">+ IVA: ${(Math.abs(parseFloat(dData.iva16) || 0) + Math.abs(parseFloat(dData.iva8) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <span className="breakdown-item subtract">− Ret.M: ${parseFloat(dData.retencion || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <span className="breakdown-item subtract">− Ret.IVA: ${parseFloat(dData.retencionIva || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="form-grid-2">
                                        <div className="f-field">
                                          <label>Referencia / Método de Pago</label>
                                          <input 
                                            type="text" 
                                            value={dData.referencia || ''} 
                                            onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'referencia', e.target.value)} 
                                            placeholder="Efectivo, Transferencia #0000, Pago Móvil..." 
                                          />
                                        </div>
                                        <div className="f-field">
                                          <label>URL Soporte (Opcional)</label>
                                          <input type="text" value={dData.facturaUrl || ''} onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'facturaUrl', e.target.value)} placeholder="https://..." />
                                        </div>
                                      </div>

                                      <div className="f-field">
                                        <label>Observaciones</label>
                                        <textarea 
                                          value={dData.observaciones || ''} 
                                          onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'observaciones', e.target.value)}
                                          placeholder="Detalles adicionales sobre esta transacción..."
                                          className="observaciones-textarea"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        </main>

        <footer className="ficha-footer">
          <p className="footer-status">Los cambios se sincronizarán con la base de datos de Firebase.</p>
          <div className="f-actions">
            <button className="btn-secondary-full" onClick={onClose}>Descartar</button>
            <button className="btn-primary-full" onClick={() => onSave(datosDetalle)}>Guardar Cambios</button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default FichaProveedor;
