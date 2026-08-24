import React from 'react';

const FiltrosCuentas = ({
  filtro, setFiltro,
  semanaFiltro, setSemanaFiltro,
  mesFiltro, setMesFiltro,
  anioFiltro, setAnioFiltro,
  diaFiltro, setDiaFiltro,
  semanasFiltradasPorAnio,
  nuevoProveedor, setNuevoProveedor,
  agregarProveedor,
  puedeEditar,
  descargarReporteAnualExcel,
  proveedores,
  setMostrarModal,
  setMostrarHistorial
}) => {
  const limpiarFiltros = () => {
    setFiltro('');
    setSemanaFiltro('');
    setMesFiltro('');
    setAnioFiltro('2026');
    setDiaFiltro('');
  };

  return (
    <div className="controles">
      <div className="filtros">
        <div className="filtro-input">
          <span className="icon">🔍</span>
          <input
            type="text"
            placeholder="Filtrar por proveedor"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>

        <div className="filtro-select">
          <span className="icon">📅</span>
          <select
            value={semanaFiltro}
            onChange={(e) => setSemanaFiltro(e.target.value)}
          >
            <option value="">Todas las semanas</option>
            {semanasFiltradasPorAnio.map(semana => (
              <option key={semana.key} value={semana.key}>
                {semana.inicio} - {semana.fin}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-select">
          <span className="icon">🌓</span>
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
          >
            <option value="">Cualquier Mes</option>
            <option value="1">Enero</option>
            <option value="2">Febrero</option>
            <option value="3">Marzo</option>
            <option value="4">Abril</option>
            <option value="5">Mayo</option>
            <option value="6">Junio</option>
            <option value="7">Julio</option>
            <option value="8">Agosto</option>
            <option value="9">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>
        </div>

        <div className="filtro-select">
          <span className="icon">🗓️</span>
          <select
            value={anioFiltro}
            onChange={(e) => setAnioFiltro(e.target.value)}
          >
            <option value="">Todos los años</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
            <option value="2029">2029</option>
            <option value="2030">2030</option>
          </select>
        </div>

        <div className="filtro-date">
          <label className="d-label">Ver Día:</label>
          <input
            type="date"
            value={diaFiltro}
            onChange={(e) => setDiaFiltro(e.target.value)}
          />
        </div>

        <button className="btn-limpiar" onClick={limpiarFiltros} title="Limpiar todos los filtros">
          🔄 Reiniciar
        </button>
      </div>

      <div className="acciones">
        {puedeEditar && (
          <>
            <div className="nuevo-proveedor">
              <input
                type="text"
                placeholder="Nombre del proveedor"
                value={nuevoProveedor.nombre}
                onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, nombre: e.target.value })}
              />
              <button onClick={agregarProveedor}>Agregar Proveedor</button>
            </div>
            <button className="btn-agregar-semana" onClick={() => setMostrarModal(true)}>
              📅 Nueva Semana
            </button>
          </>
        )}
        <button className="btn-exportar" onClick={() => descargarReporteAnualExcel(proveedores, semanas)}>
          📥 Descargar Reporte Anual Consolidado
        </button>
        <button className="btn-historial" onClick={() => setMostrarHistorial(true)}>
          <span className="icon">⏱️</span> Historial de Movimientos
        </button>
      </div>
    </div>
  );
};

export default FiltrosCuentas;
