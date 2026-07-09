import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../credentials';
import { collection, getDocs } from 'firebase/firestore';
import './TotalDeudas.css';

const TotalDeudas = () => {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Cargar proveedores desde Firebase (colección por_pagar)
  useEffect(() => {
    const cargarProveedores = async () => {
      setCargando(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'por_pagar'));
        const proveedoresData = [];
        
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
        });
        
        // Ordenar por nombre alfabéticamente
        proveedoresData.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        setProveedores(proveedoresData);
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
      } finally {
        setCargando(false);
      }
    };

    cargarProveedores();
  }, []);

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
                    <div className="nombre-proveedor">
                      <span className="avatar">{proveedor.nombre.charAt(0).toUpperCase()}</span>
                      {proveedor.nombre}
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