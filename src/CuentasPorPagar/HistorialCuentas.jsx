import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../credentials';
import './HistorialCuentas.css';

const HistorialCuentas = ({ onClose }) => {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const q = query(
          collection(db, 'historial_cuentas'),
          orderBy('fecha', 'desc'),
          limit(100) // Limitar a los últimos 100 registros
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHistorial(data);
      } catch (error) {
        console.error("Error al cargar historial:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarHistorial();
  }, []);

  const formatearFecha = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
    const date = timestamp.toDate();
    return date.toLocaleString('es-VE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getActionColor = (accion) => {
    switch (accion) {
      case 'CREACIÓN': return 'historial-accion-creacion';
      case 'EDICIÓN': return 'historial-accion-edicion';
      case 'ELIMINACIÓN': return 'historial-accion-eliminacion';
      default: return '';
    }
  };

  return (
    <div className="historial-modal-overlay">
      <div className="historial-modal">
        <div className="historial-modal-header">
          <h2>Historial de Cambios (Cuentas por Pagar)</h2>
          <button className="historial-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="historial-modal-content">
          {cargando ? (
            <div className="historial-loading">Cargando historial...</div>
          ) : historial.length === 0 ? (
            <div className="historial-empty">No hay registros recientes.</div>
          ) : (
            <table className="historial-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((registro) => (
                  <tr key={registro.id}>
                    <td>{formatearFecha(registro.fecha)}</td>
                    <td className="historial-user">{registro.usuario}</td>
                    <td>
                      <span className={`historial-badge ${getActionColor(registro.accion)}`}>
                        {registro.accion}
                      </span>
                    </td>
                    <td className="historial-details">
                      {registro.detalles && typeof registro.detalles === 'object' ? (
                        <ul className="historial-details-list">
                          {Object.entries(registro.detalles).map(([key, value]) => (
                            <li key={key}>
                              <strong>{key}:</strong> {String(value)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>{registro.detalles || 'Sin detalles'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialCuentas;
