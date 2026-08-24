import React from 'react';
import { 
  obtenerTotalesSemana, 
  calcularTotalProveedor, 
  calcularTotalPagado, 
  calcularSaldoPendienteProveedor, 
  calcularSaldoPendienteGeneral 
} from '../utils';

const TablaCuentas = ({
  proveedoresFiltrados,
  proveedores,
  semanasAMostrar,
  semanas,
  puedeEditar,
  puedeEliminar,
  abrirDetalleProveedor,
  eliminarSemana,
  actualizarPagoCompleto,
  eliminarProveedor,
  descargarReporteProveedorCSV
}) => {
  return (
    <div className="tabla-container">
      <table className="tabla-proveedores">
        <thead>
          <tr>
            <th className="proveedor-header">Proveedor</th>
            {semanasAMostrar.map(semana => (
              <th key={semana.key} className="semana-header">
                <div className="semana-titulo">
                  <span>{semana.inicio}</span>
                  <span>a</span>
                  <span>{semana.fin}</span>
                </div>
                <div className="semana-acciones">
                  {puedeEliminar && (
                    <button
                      className="btn-eliminar-semana"
                      onClick={() => eliminarSemana(semana.key)}
                      title="Eliminar semana"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </th>
            ))}
            <th className="total-header">Total a Pagar</th>
            <th className="total-header">Total Pagado</th>
            <th className="total-header">Saldo Pendiente</th>
            <th className="acciones-header">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {proveedoresFiltrados.length > 0 ? (
            proveedoresFiltrados.map(proveedor => (
              <tr key={proveedor.id}>
                <td
                  className="proveedor-nombre clickable"
                  onClick={() => abrirDetalleProveedor(proveedor)}
                >
                  <div className="nombre-wrapper">
                    {proveedor.nombre}
                    <span className="info-tag">VER FICHA</span>
                  </div>
                </td>
                {semanasAMostrar.map(semana => {
                  const totales = obtenerTotalesSemana(proveedor, semana.key);
                  const deudaMeta = proveedor.deudas?.find(d => d.semana === semana.key) || {};

                  return (
                    <td key={semana.key} className={deudaMeta.pagadoCompleto || (totales.monto > 0 && totales.saldo === 0) ? 'deuda pagado' : 'deuda'}>
                      <div className="contenido-deuda">
                        <div className="monto-summary" onClick={() => abrirDetalleProveedor(proveedor, semana.key)}>
                          <div className="summary-row">
                            <span className="label">Total Deuda:</span>
                            <span className="value">${totales.monto.toLocaleString()}</span>
                          </div>
                          <div className="summary-row">
                            <span className="label">Saldo:</span>
                            <span className={`value ${totales.saldo > 0 ? 'pendiente' : 'al-dia'}`}>
                              ${totales.saldo.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {puedeEditar && (
                          <label className="checkbox-pagado">
                            <input
                              type="checkbox"
                              checked={deudaMeta.pagadoCompleto}
                              onChange={(e) => actualizarPagoCompleto(proveedor.id, semana.key, e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            Marcar pagado
                          </label>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="total-proveedor">
                  <div className="total-monto">
                    ${calcularTotalProveedor(proveedor, semanasAMostrar).toLocaleString()}
                  </div>
                </td>
                <td className="total-pagado">
                  <div className="total-monto">
                    ${calcularTotalPagado(proveedor, semanasAMostrar).toLocaleString()}
                  </div>
                </td>
                <td className="saldo-pendiente">
                  <div className="total-monto">
                    ${calcularSaldoPendienteProveedor(proveedor, semanasAMostrar).toLocaleString()}
                  </div>
                </td>
                <td className="acciones-tabla">
                  <div className="acciones-wrapper">
                    <button
                      className="btn btn-descargar-individual"
                      onClick={() => descargarReporteProveedorCSV(proveedor)}
                      title="Descargar Estado de Cuenta Completo"
                    >
                      📥 Reporte
                    </button>
                    {puedeEliminar && (
                      <button
                        className="btn btn-eliminar"
                        onClick={() => eliminarProveedor(proveedor.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={semanasAMostrar.length + 5} className="sin-resultados">
                {proveedores.length === 0 ? 'No hay proveedores registrados' : 'No se encontraron resultados'}
              </td>
            </tr>
          )}
        </tbody>

        <tfoot className="tabla-footer">
          <tr>
            <td className="footer-label">TOTAL SEMANAL:</td>
            {semanasAMostrar.map(semana => {
              const totalSemana = proveedoresFiltrados.reduce((sum, p) => {
                return sum + obtenerTotalesSemana(p, semana.key).saldo;
              }, 0);

              return (
                <td key={semana.key} className="footer-monto">
                  ${totalSemana.toLocaleString()}
                </td>
              );
            })}
            <td className="footer-monto-total">
              ${proveedoresFiltrados.reduce((sum, p) => sum + calcularTotalProveedor(p, semanasAMostrar), 0).toLocaleString()}
            </td>
            <td className="footer-monto-total">
              ${proveedoresFiltrados.reduce((sum, p) => sum + calcularTotalPagado(p, semanasAMostrar), 0).toLocaleString()}
            </td>
            <td className="footer-monto-total highlighted">
              ${calcularSaldoPendienteGeneral(proveedoresFiltrados, semanasAMostrar).toLocaleString()}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default TablaCuentas;
