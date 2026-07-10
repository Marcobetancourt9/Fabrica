import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../credentials';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './TotalDeudas.css';

const TotalDeudas = () => {
  const [proveedores, setProveedores] = useState([]);
  const [proveedoresRaw, setProveedoresRaw] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Cargar proveedores desde Firebase (colección por_pagar)
  useEffect(() => {
    const cargarProveedores = async () => {
      setCargando(true);
      try {
        // Cargar semanas
        const configSnap = await getDoc(doc(db, 'configuracion', 'semanas_por_pagar'));
        if (configSnap.exists() && configSnap.data().lista) {
          setSemanas(configSnap.data().lista);
        }

        const querySnapshot = await getDocs(collection(db, 'por_pagar'));
        const proveedoresData = [];
        const rawData = [];
        
        querySnapshot.forEach((doc) => {
          const p = doc.data();
          let deudaAnual = 0;
          let pagadoAnual = 0;

          // Sumar registros diarios
          if (p.registroDiario) {
            Object.values(p.registroDiario).forEach(semanaObj => {
              Object.values(semanaObj).forEach(diaData => {
                const registrosDia = Array.isArray(diaData) ? diaData : [diaData];
                registrosDia.forEach(reg => {
                  if (((parseFloat(reg.monto) || 0) !== 0 || (parseFloat(reg.pagado) || 0) !== 0)) {
                    const base = parseFloat(reg.monto) || 0;
                    const sign = base < 0 ? -1 : 1;
                    const absBase = Math.abs(base);
                    const absIva16 = Math.abs(parseFloat(reg.iva16) || 0);
                    const absIva8 = Math.abs(parseFloat(reg.iva8) || 0);
                    const absRet = Math.abs(parseFloat(reg.retencion) || 0);
                    const absRetIva = Math.abs(parseFloat(reg.retencionIva) || 0);
                    const pagado = parseFloat(reg.pagado) || 0;
                    
                    const totalNeto = ((absBase + absIva16 + absIva8) - absRet - absRetIva) * sign;
                    const tipoDoc = reg.tipoDocumento || 'Factura';
                    
                    // Si es pago o nota de crédito, se considera pago (o resta de deuda)
                    // Si es factura, suma a la deuda
                    if (tipoDoc === 'Pago' || tipoDoc === 'Nota de Crédito') {
                      pagadoAnual += Math.abs(totalNeto);
                    } else {
                      deudaAnual += totalNeto;
                    }
                    
                    // Sumar lo que se haya registrado en el campo 'pagado' explícitamente
                    pagadoAnual += pagado;
                  }
                });
              });
            });
          }

          // Sumar deudas antiguas si las hay
          if (p.deudas) {
            p.deudas.forEach(d => {
              deudaAnual += parseFloat(d.monto || 0);
              pagadoAnual += parseFloat(d.pagado || 0);
            });
          }

          const pendiente = Math.max(0, deudaAnual - pagadoAnual);

          proveedoresData.push({ 
            id: doc.id, 
            nombre: p.nombre,
            saldo: deudaAnual,
            pagos: pagadoAnual,
            pendiente: pendiente
          });
          rawData.push({ id: doc.id, ...p });
        });
        
        // Ordenar por nombre alfabéticamente
        proveedoresData.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        setProveedores(proveedoresData);
        setProveedoresRaw(rawData);
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
      } finally {
        setCargando(false);
      }
    };

    cargarProveedores();
  }, []);

  // Descargar Reporte Histórico por Proveedor (CSV)
  const descargarReporteProveedorCSV = (proveedorResumen) => {
    const p = proveedoresRaw.find(pr => pr.id === proveedorResumen.id);
    if (!p) {
      alert('No se encontraron datos completos del proveedor.');
      return;
    }

    const titular = "Inversiones pincho pan express II C.A.";
    const subTitular = `Estado de Cuenta Histórico: ${p.nombre} (RIF: ${p.rif || '-'})`;

    const headers = [
      'Fecha', 'Tipo de Documento', 'Nro Referencia',
      'Monto Base', 'IVA 16%', 'IVA 8%', 'Ret. Municipal', 'Ret. IVA', '% Ret. IVA', 'Total Bruto',
      'Pagado', 'Saldo Acumulado', 'Referencia/Pago', 'Observaciones'
    ];

    let todasLasTransacciones = [];

    semanas.forEach(semana => {
      const registroSemana = p.registroDiario?.[semana.key] || {};
      const [d, m, a] = semana.inicio.split('/').map(Number);
      
      [0, 1, 2, 3, 4, 5, 6].forEach(i => {
        const fechaBase = new Date(a, m - 1, d);
        fechaBase.setDate(fechaBase.getDate() + i);
        const dk = fechaBase.toISOString().split('T')[0];
        
        const diaData = registroSemana[dk];
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
      const pagado = parseFloat(dData.pagado) || 0;
      
      const totalNeto = ((absBase + absIva16 + absIva8) - absRet - absRetIva) * sign;
      
      saldoAcumulado = saldoAcumulado + totalNeto - pagado;
      const saldoMostrar = Math.max(0, saldoAcumulado);

      const formatearNum = (num) => num.toFixed(2).replace('.', ',');

      filasTransactions.push([
        `"${dData.fechaOperacion || dData.dk}"`,
        `"${dData.tipoDocumento || 'Factura'}"`,
        `"${dData.numeroFactura || '-'}"`,
        formatearNum(base),
        formatearNum(absIva16 * sign),
        formatearNum(absIva8 * sign),
        formatearNum(absRet * sign),
        formatearNum(absRetIva * sign),
        `"${dData.aplicaRetencionIva === false ? 'No' : (dData.porcentajeRetencionIva || '75') + '%'}"`,
        formatearNum(totalNeto),
        formatearNum(pagado),
        formatearNum(saldoMostrar),
        `"${dData.referencia || '-'}"`,
        `"${(dData.observaciones || '').replace(/\n/g, ' ')}"`
      ]);
    });

    const csvContent = [
      titular,
      subTitular,
      '',
      headers.join(';'),
      ...filasTransactions.map(f => f.join(';'))
    ].join('\n');

    const universalBOM = "\uFEFF";
    const blob = new Blob([universalBOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Estado_Cuenta_${p.nombre.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrar proveedores por búsqueda
  const proveedoresFiltrados = proveedores.filter(proveedor =>
    proveedor.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Calcular totales
  const totalSaldo = useMemo(() => proveedoresFiltrados.reduce((total, p) => total + p.saldo, 0), [proveedoresFiltrados]);
  const totalPagos = useMemo(() => proveedoresFiltrados.reduce((total, p) => total + p.pagos, 0), [proveedoresFiltrados]);
  const totalPendiente = useMemo(() => proveedoresFiltrados.reduce((total, p) => total + p.pendiente, 0), [proveedoresFiltrados]);

  if (cargando) {
    return (
      <div className="cargando-container">
        <div className="cargando-spinner"></div>
        <p>Cargando datos consolidados de cuentas por pagar...</p>
      </div>
    );
  }

  return (
    <div className="total-deudas-container">
      <br />
      <header className="app-header">
        <h1>💰 Total de Deudas (Consolidado)</h1>
        <p>Vista general de saldos y pagos calculados desde Cuentas por Pagar</p>
      </header>
      
      {/* Panel de búsqueda y acciones */}
      <div className="panel-acciones">
        <div className="buscador">
          <span className="icono-busqueda">🔍</span>
          <input
            type="text"
            placeholder="Buscar proveedor por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="info-badge">
          ℹ️ Los datos se calculan automáticamente desde la página de Cuentas por Pagar.
        </div>
      </div>
      
      {/* Tabla de proveedores */}
      <div className="tabla-container">
        <table className="tabla-proveedores">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th className="text-right">Deuda Total ($)</th>
              <th className="text-right">Pagos Realizados ($)</th>
              <th className="text-right">Saldo Pendiente ($)</th>
            </tr>
          </thead>
          <tbody>
            {proveedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan="4" className="sin-resultados">
                  {busqueda ? 'No se encontraron proveedores con ese nombre' : 'No hay proveedores registrados'}
                </td>
              </tr>
            ) : (
              proveedoresFiltrados.map((proveedor) => (
                <tr key={proveedor.id}>
                  <td>
                    <div className="nombre-proveedor nombre-descargable" onClick={() => descargarReporteProveedorCSV(proveedor)} title="Click para descargar reporte CSV del proveedor">
                      <span className="avatar">{proveedor.nombre.charAt(0).toUpperCase()}</span>
                      {proveedor.nombre}
                      <span className="download-icon">📥</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <span className={`monto ${proveedor.saldo > 0 ? 'positivo' : ''}`}>
                      ${proveedor.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="monto negativo">
                      ${proveedor.pagos.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={`monto ${proveedor.pendiente > 0 ? 'saldo-pendiente' : 'saldo-cero'}`}>
                      ${proveedor.pendiente.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          
          {/* Totales */}
          <tfoot>
            <tr className="total-fila">
              <td>SUMA TOTAL DE LA DEUDA</td>
              <td className="text-right">${totalSaldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="text-right">${totalPagos.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className={`text-right ${totalPendiente > 0 ? 'total-pendiente' : 'total-cero'}`}>
                ${totalPendiente.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TotalDeudas;