import React from 'react';
import { auth } from '../../credentials';
import { useCuentasPorPagar } from './hooks/useCuentasPorPagar';
import FiltrosCuentas from './components/FiltrosCuentas';
import TablaCuentas from './components/TablaCuentas';
import ModalesCuentas from './components/ModalesCuentas';
import FichaProveedor from './FichaProveedor';
import HistorialCuentas from './HistorialCuentas';
import { descargarReporteAnualExcel, descargarReporteProveedorCSV } from './utils';
import './CuentasPorPagar.css';

const CuentasPorPagar = () => {
  const userEmail = auth?.currentUser?.email;
  const state = useCuentasPorPagar(userEmail);

  if (state.mostrarModalDetalle && state.proveedorSeleccionado) {
    return (
      <FichaProveedor
        proveedor={state.proveedorSeleccionado}
        semanas={state.semanas}
        semanaAbiertaInicial={state.semanaAbierta}
        onClose={() => state.setMostrarModalDetalle(false)}
        onSave={state.guardarDetalleProveedor}
        puedeEditar={state.puedeEditar}
        puedeEliminar={state.puedeEliminar}
        onDescargarReporte={() => descargarReporteProveedorCSV(state.proveedorSeleccionado, state.semanas)}
      />
    );
  }

  return (
    <div className="cuentas-por-pagar">
      <br />
      <div className="page-header">
        <h1>Cuentas por Pagar</h1>
        <p>Gestión de deudas a proveedores por semana - {state.anioFiltro}</p>
      </div>

      <FiltrosCuentas
        filtro={state.filtro} setFiltro={state.setFiltro}
        semanaFiltro={state.semanaFiltro} setSemanaFiltro={state.setSemanaFiltro}
        mesFiltro={state.mesFiltro} setMesFiltro={state.setMesFiltro}
        anioFiltro={state.anioFiltro} setAnioFiltro={state.setAnioFiltro}
        diaFiltro={state.diaFiltro} setDiaFiltro={state.setDiaFiltro}
        semanasFiltradasPorAnio={state.semanasFiltradasPorAnio}
        nuevoProveedor={state.nuevoProveedor} setNuevoProveedor={state.setNuevoProveedor}
        agregarProveedor={state.agregarProveedor}
        puedeEditar={state.puedeEditar}
        descargarReporteAnualExcel={() => descargarReporteAnualExcel(state.proveedores, state.semanas)}
        proveedores={state.proveedores}
        setMostrarModal={state.setMostrarModal}
        setMostrarHistorial={state.setMostrarHistorial}
      />

      <ModalesCuentas
        mostrarModal={state.mostrarModal}
        setMostrarModal={state.setMostrarModal}
        mostrarDropdownSemanas={state.mostrarDropdownSemanas}
        setMostrarDropdownSemanas={state.setMostrarDropdownSemanas}
        nuevaSemana={state.nuevaSemana}
        setNuevaSemana={state.setNuevaSemana}
        agregarSemana={state.agregarSemana}
        semanas={state.semanas}
        anioFiltro={state.anioFiltro}
      />

      <div className="resumen">
        <div className="resumen-item">
          <span className="resumen-label">Proveedores:</span>
          <span className="resumen-valor">{state.proveedoresFiltrados.length}</span>
        </div>
        <div className="resumen-item">
          <span className="resumen-label">Semanas:</span>
          <span className="resumen-valor">{state.semanasAMostrar.length}</span>
        </div>
        <div className="resumen-item">
          <span className="resumen-label">Total a Pagar:</span>
          <span className="resumen-valor">${state.totalesGlobales.totalDeuda.toLocaleString()}</span>
        </div>
        <div className="resumen-item">
          <span className="resumen-label">Total Pagado:</span>
          <span className="resumen-valor">${state.totalesGlobales.totalPagado.toLocaleString()}</span>
        </div>
        <div className="resumen-item total">
          <span className="resumen-label">Saldo Pendiente:</span>
          <span className="resumen-valor">${state.totalesGlobales.saldoFaltante.toLocaleString()}</span>
        </div>
      </div>

      <TablaCuentas
        proveedoresFiltrados={state.proveedoresFiltrados}
        proveedores={state.proveedores}
        semanasAMostrar={state.semanasAMostrar}
        semanas={state.semanas}
        puedeEditar={state.puedeEditar}
        puedeEliminar={state.puedeEliminar}
        abrirDetalleProveedor={state.abrirDetalleProveedor}
        eliminarSemana={state.eliminarSemana}
        actualizarPagoCompleto={state.actualizarPagoCompleto}
        eliminarProveedor={state.eliminarProveedor}
        descargarReporteProveedorCSV={(p) => descargarReporteProveedorCSV(p, state.semanas)}
      />

      {state.mostrarHistorial && (
        <HistorialCuentas onClose={() => state.setMostrarHistorial(false)} />
      )}
    </div>
  );
};

export default CuentasPorPagar;