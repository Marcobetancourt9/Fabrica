import React, { useState, useEffect } from 'react';
import { db } from '../../credentials';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import './Estadisticas.css';

const Estadisticas = () => {
  const [proveedoresTop, setProveedoresTop] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState('mes'); // 'mes', 'trimestre', 'año'
  const [tipoGrafica, setTipoGrafica] = useState('barras'); // 'barras', 'tarta', 'lineas'

  // Cargar los 5 proveedores con mayor saldo desde Firebase
  useEffect(() => {
    const cargarProveedoresTop = async () => {
      try {
        const q = query(
          collection(db, 'proveedores'), 
          orderBy('saldo', 'desc'), 
          limit(5)
        );
        
        const querySnapshot = await getDocs(q);
        const proveedoresData = [];
        
        querySnapshot.forEach((doc) => {
          proveedoresData.push({ id: doc.id, ...doc.data() });
        });
        
        setProveedoresTop(proveedoresData);
        setCargando(false);
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
        setCargando(false);
      }
    };

    cargarProveedoresTop();
  }, []);

  // Calcular totales
  const totalSaldoTop = proveedoresTop.reduce((total, proveedor) => total + parseFloat(proveedor.saldo || 0), 0);
  const totalPagosTop = proveedoresTop.reduce((total, proveedor) => total + parseFloat(proveedor.pagos || 0), 0);
  const totalPendienteTop = proveedoresTop.reduce((total, proveedor) => total + parseFloat(proveedor.pendiente || 0), 0);

  // Colores para las gráficas
  const colores = ['#4a6491', '#2c3e50', '#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'];
  
  if (cargando) {
    return (
      <div className="cargando-container">
        <div className="cargando-spinner"></div>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="estadisticas-container">
      <header className="app-header">
        <h1>📊 Dashboard de Estadísticas</h1>
        <p>Top 5 proveedores con mayor saldo - Análisis detallado</p>
      </header>

      {/* Filtros de período */}
      <div className="filtros-container">
        <div className="filtros-periodo">
          <h2>Filtrar por período:</h2>
          <div className="botones-periodo">
            <button 
              className={periodo === 'mes' ? 'btn-periodo activo' : 'btn-periodo'}
              onClick={() => setPeriodo('mes')}
            >
              Este Mes
            </button>
            <button 
              className={periodo === 'trimestre' ? 'btn-periodo activo' : 'btn-periodo'}
              onClick={() => setPeriodo('trimestre')}
            >
              Este Trimestre
            </button>
            <button 
              className={periodo === 'año' ? 'btn-periodo activo' : 'btn-periodo'}
              onClick={() => setPeriodo('año')}
            >
              Este Año
            </button>
          </div>
        </div>

        <div className="filtros-graficas">
          <h2>Tipo de gráfica:</h2>
          <div className="botones-graficas">
            <button 
              className={tipoGrafica === 'barras' ? 'btn-grafica activo' : 'btn-grafica'}
              onClick={() => setTipoGrafica('barras')}
            >
              Barras
            </button>
            <button 
              className={tipoGrafica === 'tarta' ? 'btn-grafica activo' : 'btn-grafica'}
              onClick={() => setTipoGrafica('tarta')}
            >
              Tarta
            </button>
            <button 
              className={tipoGrafica === 'lineas' ? 'btn-grafica activo' : 'btn-grafica'}
              onClick={() => setTipoGrafica('lineas')}
            >
              Líneas
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="resumen-cards">
        <div className="resumen-card">
          <div className="resumen-icono">💰</div>
          <div className="resumen-info">
            <h3>Saldo Total Top 5</h3>
            <p className="resumen-monto">${totalSaldoTop.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="resumen-tendencia positivo">+2.5% vs mes anterior</p>
          </div>
        </div>

        <div className="resumen-card">
          <div className="resumen-icono">💸</div>
          <div className="resumen-info">
            <h3>Pagos Total Top 5</h3>
            <p className="resumen-monto">${totalPagosTop.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="resumen-tendencia positivo">+5.1% vs mes anterior</p>
          </div>
        </div>

        <div className="resumen-card">
          <div className="resumen-icono">📉</div>
          <div className="resumen-info">
            <h3>Saldo Pendiente Top 5</h3>
            <p className="resumen-monto pendiente">${totalPendienteTop.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="resumen-tendencia negativo">-3.2% vs mes anterior</p>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="graficas-container">
        <div className="grafica-principal">
          <h2>Distribución de Saldos por Proveedor</h2>
          
          {tipoGrafica === 'barras' && (
            <div className="grafico-barras">
              {proveedoresTop.map((proveedor, index) => {
                const maxSaldo = Math.max(...proveedoresTop.map(p => parseFloat(p.saldo || 0)));
                const altura = (parseFloat(proveedor.saldo || 0) / maxSaldo) * 100;
                
                return (
                  <div key={proveedor.id} className="barra-container">
                    <div className="barra-etiqueta">{proveedor.nombre}</div>
                    <div className="barra">
                      <div 
                        className="barra-progreso" 
                        style={{ 
                          height: `${altura}%`,
                          backgroundColor: colores[index % colores.length]
                        }}
                      >
                        <span className="barra-valor">
                          ${parseFloat(proveedor.saldo || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <div className="barra-info">
                      <p>Pagos: ${parseFloat(proveedor.pagos || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p>Pendiente: ${parseFloat(proveedor.pendiente || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tipoGrafica === 'tarta' && (
            <div className="grafico-tarta-container">
              <div className="grafico-tarta">
                {proveedoresTop.map((proveedor, index) => {
                  const porcentaje = (parseFloat(proveedor.saldo || 0) / totalSaldoTop) * 100;
                  const offset = proveedoresTop.slice(0, index).reduce((acc, p) => acc + (parseFloat(p.saldo || 0) / totalSaldoTop) * 100, 0);
                  
                  return (
                    <div 
                      key={proveedor.id}
                      className="sector-tarta"
                      style={{
                        backgroundColor: colores[index % colores.length],
                        transform: `rotate(${offset * 3.6}deg)`,
                        clipPath: `conic-gradient(from 0deg at 50% 50%, ${colores[index % colores.length]} 0% ${porcentaje}%, transparent ${porcentaje}% 100%)`
                      }}
                    ></div>
                  );
                })}
                <div className="centro-tarta">
                  <span>Total<br/>${totalSaldoTop.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              </div>
              <div className="leyenda-tarta">
                {proveedoresTop.map((proveedor, index) => (
                  <div key={proveedor.id} className="item-leyenda">
                    <div className="color-leyenda" style={{ backgroundColor: colores[index % colores.length] }}></div>
                    <span className="nombre-leyenda">{proveedor.nombre}</span>
                    <span className="valor-leyenda">
                      ${parseFloat(proveedor.saldo || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                      ({(parseFloat(proveedor.saldo || 0) / totalSaldoTop * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tipoGrafica === 'lineas' && (
            <div className="grafico-lineas">
              <div className="eje-y">
                <span>${Math.max(...proveedoresTop.map(p => parseFloat(p.saldo || 0))).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span>${(Math.max(...proveedoresTop.map(p => parseFloat(p.saldo || 0))) / 2).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span>$0</span>
              </div>
              <div className="lineas-container">
                {proveedoresTop.map((proveedor, index) => {
                  const maxSaldo = Math.max(...proveedoresTop.map(p => parseFloat(p.saldo || 0)));
                  const altura = (parseFloat(proveedor.saldo || 0) / maxSaldo) * 100;
                  
                  return (
                    <div key={proveedor.id} className="linea-data">
                      <div 
                        className="punto-linea"
                        style={{ 
                          bottom: `${altura}%`,
                          backgroundColor: colores[index % colores.length]
                        }}
                      >
                        <div className="tooltip-linea">
                          {proveedor.nombre}: ${parseFloat(proveedor.saldo || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div 
                        className="linea"
                        style={{ 
                          height: `${altura}%`,
                          backgroundColor: colores[index % colores.length]
                        }}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <div className="eje-x">
                {proveedoresTop.map((proveedor, index) => (
                  <span key={proveedor.id} className="etiqueta-eje-x">{proveedor.nombre}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="graficas-secundarias">
          <div className="grafica-secundaria">
            <h3>Comparación Saldo vs Pagos</h3>
            <div className="grafico-comparativo">
              {proveedoresTop.map((proveedor, index) => {
                const maxValor = Math.max(
                  ...proveedoresTop.map(p => parseFloat(p.saldo || 0)),
                  ...proveedoresTop.map(p => parseFloat(p.pagos || 0))
                );
                const alturaSaldo = (parseFloat(proveedor.saldo || 0) / maxValor) * 100;
                const alturaPagos = (parseFloat(proveedor.pagos || 0) / maxValor) * 100;
                
                return (
                  <div key={proveedor.id} className="barras-comparativas">
                    <div className="barra-comparativa-container">
                      <div className="barra-comparativa-etiqueta">{proveedor.nombre}</div>
                      <div className="barras-dobles">
                        <div 
                          className="barra-comparativa saldo"
                          style={{ height: `${alturaSaldo}%` }}
                        >
                          <span className="valor-barra">${parseFloat(proveedor.saldo || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                        <div 
                          className="barra-comparativa pago"
                          style={{ height: `${alturaPagos}%` }}
                        >
                          <span className="valor-barra">${parseFloat(proveedor.pagos || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grafica-secundaria">
            <h3>Porcentaje de Saldo Pendiente</h3>
            <div className="grafico-circular-mini">
              {proveedoresTop.map((proveedor, index) => {
                const porcentajePendiente = (parseFloat(proveedor.pendiente || 0) / parseFloat(proveedor.saldo || 1)) * 100;
                
                return (
                  <div key={proveedor.id} className="circular-mini-container">
                    <div className="circular-mini">
                      <div 
                        className="circular-mini-progreso"
                        style={{ 
                          background: `conic-gradient(
                            ${colores[index % colores.length]} 0% ${porcentajePendiente}%, 
                            #f0f2f5 ${porcentajePendiente}% 100%
                          )`
                        }}
                      ></div>
                      <div className="circular-mini-texto">
                        <span>{porcentajePendiente.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="circular-mini-info">
                      <span className="circular-mini-nombre">{proveedor.nombre}</span>
                      <span className="circular-mini-valor">${parseFloat(proveedor.pendiente || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla detallada */}
      <div className="tabla-container">
        <h2>Detalle de los 5 Proveedores con Mayor Saldo</h2>
        <table className="tabla-proveedores">
          <thead>
            <tr>
              <th>Posición</th>
              <th>Proveedor</th>
              <th>Saldo ($)</th>
              <th>Pagos ($)</th>
              <th>Saldo Pendiente ($)</th>
              <th>Porcentaje del Total</th>
            </tr>
          </thead>
          <tbody>
            {proveedoresTop.map((proveedor, index) => (
              <tr key={proveedor.id}>
                <td>
                  <div className={`posicion posicion-${index + 1}`}>
                    #{index + 1}
                  </div>
                </td>
                <td>
                  <div className="nombre-proveedor">
                    <span className="avatar">{proveedor.nombre.charAt(0).toUpperCase()}</span>
                    {proveedor.nombre}
                  </div>
                </td>
                <td>
                  <span className="monto positivo">
                    ${parseFloat(proveedor.saldo || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td>
                  <span className="monto negativo">
                    ${parseFloat(proveedor.pagos || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td>
                  <span className={`monto ${parseFloat(proveedor.pendiente || 0) > 0 ? 'saldo-pendiente' : 'saldo-cero'}`}>
                    ${parseFloat(proveedor.pendiente || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td>
                  <div className="porcentaje-container">
                    <div className="porcentaje-barra">
                      <div 
                        className="porcentaje-progreso" 
                        style={{ 
                          width: `${(parseFloat(proveedor.saldo || 0) / totalSaldoTop) * 100}%`,
                          backgroundColor: colores[index % colores.length]
                        }}
                      ></div>
                    </div>
                    <span className="porcentaje-texto">
                      {((parseFloat(proveedor.saldo || 0) / totalSaldoTop) * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Estadisticas;