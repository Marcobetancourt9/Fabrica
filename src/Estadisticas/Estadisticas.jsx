import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../credentials';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import './Estadisticas.css';

const Estadisticas = () => {
  const [proveedoresData, setProveedoresData] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [tipoGrafica, setTipoGrafica] = useState('barras');
  const [limite, setLimite] = useState(5);
  const [paginaActual, setPaginaActual] = useState(1);
  const [semanas, setSemanas] = useState([]);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState('todas');
  const itemsPorPagina = 10;

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      try {
        // Cargar Semanas
        const configSnap = await getDoc(doc(db, 'configuracion', 'semanas_por_pagar'));
        let semanasDisponibles = [];
        if (configSnap.exists() && configSnap.data().lista) {
          semanasDisponibles = configSnap.data().lista;
          setSemanas(semanasDisponibles);
        }

        // Cargar Proveedores
        const querySnapshot = await getDocs(collection(db, 'por_pagar'));
        let data = [];
        
        querySnapshot.forEach((doc) => {
          const p = doc.data();
          let deudaTotal = 0;
          let pagadoTotal = 0;

          if (p.registroDiario) {
            Object.entries(p.registroDiario).forEach(([semanaKey, semanaObj]) => {
              // Filtrar por semana seleccionada
              if (semanaSeleccionada !== 'todas' && semanaKey !== semanaSeleccionada) {
                return;
              }

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
                    
                    if (tipoDoc === 'Pago' || tipoDoc === 'Nota de Crédito') {
                      pagadoTotal += Math.abs(totalNeto);
                    } else {
                      deudaTotal += totalNeto;
                    }
                    
                    pagadoTotal += pagado; // Sumar campo 'pagado'
                  }
                });
              });
            });
          }

          // Sumar deudas antiguas solo si se ven 'todas' las semanas
          if (p.deudas && semanaSeleccionada === 'todas') {
            p.deudas.forEach(d => {
              deudaTotal += parseFloat(d.monto || 0);
              pagadoTotal += parseFloat(d.pagado || 0);
            });
          }

          const pendiente = Math.max(0, deudaTotal - pagadoTotal);

          // Solo agregar si hay actividad en ese periodo
          if (deudaTotal > 0 || pagadoTotal > 0 || pendiente > 0) {
            data.push({ 
              id: doc.id, 
              nombre: p.nombre,
              saldo: deudaTotal,
              pagos: pagadoTotal,
              pendiente: pendiente
            });
          }
        });
        
        data.sort((a, b) => b.saldo - a.saldo);

        if (limite !== 'todos') {
          data = data.slice(0, limite);
        }
        
        setProveedoresData(data);
      } catch (error) {
        console.error('Error al cargar datos estadísticos:', error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [limite, semanaSeleccionada]);

  const totalSaldoTop = useMemo(() => proveedoresData.reduce((acc, p) => acc + parseFloat(p.saldo || 0), 0), [proveedoresData]);
  const totalPagosTop = useMemo(() => proveedoresData.reduce((acc, p) => acc + parseFloat(p.pagos || 0), 0), [proveedoresData]);
  const totalPendienteTop = useMemo(() => proveedoresData.reduce((acc, p) => acc + parseFloat(p.pendiente || 0), 0), [proveedoresData]);

  // Transform data for recharts
  const chartData = useMemo(() => {
    return proveedoresData.map(p => ({
      name: p.nombre,
      saldo: parseFloat(p.saldo || 0),
      pagos: parseFloat(p.pagos || 0),
      pendiente: parseFloat(p.pendiente || 0),
    }));
  }, [proveedoresData]);

  // Format currency
  const formatCurrency = (value) => {
    return `$${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)}`;
  };
  const formatPercentage = (value) => `${value.toFixed(1)}%`;

  const colores = ['#4a6491', '#2c3e50', '#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c', '#95a5a6', '#d35400'];

  // Pagination for table
  const totalPaginas = Math.ceil(proveedoresData.length / itemsPorPagina);
  const proveedoresPaginados = proveedoresData.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label-bold">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (cargando && proveedoresData.length === 0) {
    return (
      <div className="cargando-container">
        <div className="cargando-spinner"></div>
        <p>Cargando estadísticas de alto rendimiento...</p>
      </div>
    );
  }

  return (
    <div className="estadisticas-container">
      <header className="app-header responsive-header">
        <div className="header-content">
          <h1>📊 Panel Estadístico Avanzado</h1>
          <p>Análisis en tiempo real de saldos, pagos y obligaciones</p>
        </div>
      </header>

      {/* Controles: Límite, Período, Gráficas */}
      <div className="filtros-container">
        <div className="filtro-card glass-panel">
          <h2>Filtrar por Semana:</h2>
          <div className="selector-semana-wrapper">
            <select 
              className="select-semana-estadisticas"
              value={semanaSeleccionada} 
              onChange={(e) => setSemanaSeleccionada(e.target.value)}
            >
              <option value="todas">Todas las semanas (Consolidado)</option>
              {semanas.map((s, idx) => (
                <option key={s.key} value={s.key}>
                  Semana {idx + 1}: {s.inicio} a {s.fin}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filtro-card glass-panel">
          <h2>Mostrar Proveedores:</h2>
          <div className="botones-limite">
            {[5, 10, 25, 50, 'todos'].map((lim) => (
              <button 
                key={lim}
                className={`btn-filtro ${limite === lim ? 'activo' : ''}`}
                onClick={() => setLimite(lim)}
              >
                {lim === 'todos' ? 'Todos' : `Top ${lim}`}
              </button>
            ))}
          </div>
        </div>

        <div className="filtro-card glass-panel">
          <h2>Tipo de visualización:</h2>
          <div className="botones-graficas">
            {['barras', 'tarta', 'lineas'].map((tipo) => (
              <button 
                key={tipo}
                className={`btn-filtro ${tipoGrafica === tipo ? 'activo' : ''}`}
                onClick={() => setTipoGrafica(tipo)}
              >
                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon primary-bg">💰</div>
          <div className="kpi-content">
            <h3>Saldo Total {limite !== 'todos' ? `Top ${limite}` : ''}</h3>
            <h2>{formatCurrency(totalSaldoTop)}</h2>
            <span className="trend positive">+2.5% mes actual</span>
          </div>
        </div>
        <div className="kpi-card glass-panel">
          <div className="kpi-icon success-bg">💸</div>
          <div className="kpi-content">
            <h3>Pagos Realizados</h3>
            <h2>{formatCurrency(totalPagosTop)}</h2>
            <span className="trend positive">+5.1% mes actual</span>
          </div>
        </div>
        <div className="kpi-card glass-panel">
          <div className="kpi-icon warning-bg">📉</div>
          <div className="kpi-content">
            <h3>Deuda Pendiente</h3>
            <h2 className="text-warning">{formatCurrency(totalPendienteTop)}</h2>
            <span className="trend negative">-1.2% mes actual</span>
          </div>
        </div>
      </div>

      {cargando && <div className="cargando-spinner-small"></div>}

      {/* Recharts - Gráfica Principal */}
      <div className="chart-main-card glass-panel fade-in">
        <h2>Distribución de Saldos por Proveedor</h2>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={400}>
            {tipoGrafica === 'barras' ? (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={customTooltip} cursor={{ fill: '#f1f5f9' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="saldo" name="Saldo Actual" fill="#4a6491" radius={[4, 4, 0, 0]} animationDuration={1000}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colores[index % colores.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : tipoGrafica === 'tarta' ? (
              <PieChart>
                <RechartsTooltip content={customTooltip} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={2}
                  dataKey="saldo"
                  animationDuration={1000}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colores[index % colores.length]} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={customTooltip} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} animationDuration={1000} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficas Secundarias */}
      <div className="graficas-secundarias-grid">
        <div className="chart-sec-card glass-panel fade-in">
          <h3>Comparación Saldo vs Pagos</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide={chartData.length > 15} />
                <YAxis tickFormatter={(val) => `$${val/1000}k`} width={60} />
                <RechartsTooltip content={customTooltip} cursor={{ fill: '#f1f5f9' }} />
                <Legend />
                <Bar dataKey="saldo" name="Saldo" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="pagos" name="Pagos" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-sec-card glass-panel fade-in">
          <h3>Composición Deuda Pendiente</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <RechartsTooltip content={customTooltip} />
                <Pie data={chartData} cx="50%" cy="50%" outerRadius={100} dataKey="pendiente">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colores[(index + 3) % colores.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla Avanzada Responsiva */}
      <div className="tabla-avanzada-card glass-panel fade-in">
        <div className="tabla-header">
          <h2>Detalles de Cuenta</h2>
          <span className="badge-count">Total Listados: {proveedoresData.length}</span>
        </div>
        
        <div className="tabla-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Proveedor</th>
                <th className="text-right">Saldo Actual</th>
                <th className="text-right">Pagos Realizados</th>
                <th className="text-right">Deuda Pendiente</th>
                <th>Participación %</th>
              </tr>
            </thead>
            <tbody>
              {proveedoresPaginados.map((p, index) => {
                const absoluteIndex = (paginaActual - 1) * itemsPorPagina + index + 1;
                const porcentaje = (parseFloat(p.saldo || 0) / totalSaldoTop) * 100 || 0;
                
                return (
                  <tr key={p.id}>
                    <td><span className="idx-badge">{absoluteIndex}</span></td>
                    <td>
                      <div className="prov-info">
                        <div className="prov-avatar" style={{ backgroundColor: colores[absoluteIndex % colores.length] }}>
                          {p.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className="prov-name">{p.nombre}</span>
                      </div>
                    </td>
                    <td className="text-right font-bold text-primary">{formatCurrency(p.saldo || 0)}</td>
                    <td className="text-right text-success">{formatCurrency(p.pagos || 0)}</td>
                    <td className={`text-right font-medium ${parseFloat(p.pendiente || 0) > 0 ? 'text-warning' : 'text-neutral'}`}>
                      {formatCurrency(p.pendiente || 0)}
                    </td>
                    <td>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${porcentaje}%`, backgroundColor: colores[absoluteIndex % colores.length] }} />
                        <span className="progress-text">{formatPercentage(porcentaje)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {proveedoresData.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center no-data">No se encontraron datos para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginación */}
        {totalPaginas > 1 && (
          <div className="pagination">
            <button 
              disabled={paginaActual === 1} 
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              className="btn-page"
            >
              &laquo; Anterior
            </button>
            <div className="page-indicators">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(page => (
                <button 
                  key={page} 
                  className={`dot-page ${paginaActual === page ? 'active' : ''}`}
                  onClick={() => setPaginaActual(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              disabled={paginaActual === totalPaginas} 
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              className="btn-page"
            >
              Siguiente &raquo;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Estadisticas;