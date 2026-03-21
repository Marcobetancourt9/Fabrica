import React, { useState } from 'react';
import './FichaProveedor.css';

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

  const manejarCambioDiario = (semanaKey, diaKey, campo, valor) => {
    const nuevoRegistro = { ...datosDetalle.registroDiario };
    if (!nuevoRegistro[semanaKey]) nuevoRegistro[semanaKey] = {};
    if (!nuevoRegistro[semanaKey][diaKey]) nuevoRegistro[semanaKey][diaKey] = {};

    const registroDia = { ...nuevoRegistro[semanaKey][diaKey] };
    registroDia[campo] = valor;

    // Auto-cálculo de IVA
    if (campo === 'monto') {
      const montoNum = parseFloat(valor) || 0;
      registroDia.iva16 = (montoNum * 0.16).toFixed(2);
      registroDia.iva8 = (montoNum * 0.08).toFixed(2);
    }

    nuevoRegistro[semanaKey][diaKey] = registroDia;
    setDatosDetalle({ ...datosDetalle, registroDiario: nuevoRegistro });
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
                .filter(s => s.key === semanaAbierta || (obtenerTotalesSemana(s.key).monto > 0))
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
                            const hasData = (parseFloat(dData.monto) || 0) > 0;

                            return (
                                <div key={dia.key} className={`day-full-entry ${isDiaOpen ? 'active' : ''} ${hasData ? 'has-data' : ''}`}>
                                  <div className="day-full-header" onClick={() => setDiaAbierto(isDiaOpen ? null : dia.key)}>
                                    <span className="name">{dia.label}</span>
                                    {hasData && (
                                      <span className="m-total">Total: ${((parseFloat(dData.monto)||0)+(parseFloat(dData.iva16)||0)+(parseFloat(dData.iva8)||0)+(parseFloat(dData.retencion)||0)).toLocaleString()}</span>
                                    )}
                                    <button className="btn-edit-inline">{isDiaOpen ? 'Ocultar' : 'Editar'}</button>
                                  </div>

                                  {isDiaOpen && (
                                    <div className="day-full-form">
                                      <div className="form-grid-3">
                                        <div className="f-field">
                                          <label>Tipo de Documento</label>
                                          <select 
                                            value={dData.tipoDocumento || 'Factura'} 
                                            onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'tipoDocumento', e.target.value)}
                                          >
                                            <option value="Factura">Factura</option>
                                            <option value="Nota de Entrega">Nota de Entrega</option>
                                            <option value="Nota de Débito">Nota de Débito</option>
                                            <option value="Nota de Crédito">Nota de Crédito</option>
                                            <option value="Otro">Otro</option>
                                          </select>
                                        </div>
                                        <div className="f-field">
                                          <label>Número de Factura/Control</label>
                                          <input type="text" value={dData.numeroFactura || ''} onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'numeroFactura', e.target.value)} placeholder="0001" />
                                        </div>
                                        <div className="f-field">
                                          <label>Fecha de Operación</label>
                                          <input type="date" value={dData.fechaOperacion || dia.key} onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'fechaOperacion', e.target.value)} />
                                        </div>
                                      </div>

                                      <div className="form-grid-3">
                                        <div className="f-field">
                                          <label>Monto Base</label>
                                          <input type="number" value={dData.monto || ''} onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'monto', e.target.value)} placeholder="0.00" />
                                        </div>
                                        <div className="f-field">
                                          <label>Pagado</label>
                                          <input type="number" value={dData.pagado || ''} onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'pagado', e.target.value)} placeholder="0.00" />
                                        </div>
                                        <div className="f-field">
                                          <label>Ret. Municipal</label>
                                          <input type="number" value={dData.retencion || ''} onChange={(e) => manejarCambioDiario(semana.key, dia.key, 'retencion', e.target.value)} placeholder="0.00" />
                                        </div>
                                      </div>

                                      <div className="form-grid-2">
                                        <div className="f-field calc">
                                          <label>IVA 16% (Auto)</label>
                                          <input type="text" value={dData.iva16 || '0.00'} readOnly />
                                        </div>
                                        <div className="f-field calc">
                                          <label>IVA 8% (Auto)</label>
                                          <input type="text" value={dData.iva8 || '0.00'} readOnly />
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
                                          style={{ minHeight: '80px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', padding: '12px' }}
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
