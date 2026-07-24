import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../credentials';
import { FaPlusCircle, FaEdit, FaTrashAlt, FaHistory, FaTimes, FaSpinner } from 'react-icons/fa';
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
          limit(100)
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

  const formatearFechaObj = (timestamp) => {
    if (!timestamp) return { dia: 'Fecha desconocida', hora: '' };
    const date = timestamp.toDate();
    const dia = date.toLocaleDateString('es-VE', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    const hora = date.toLocaleTimeString('es-VE', {
      hour: '2-digit', minute: '2-digit'
    });
    return { dia, hora };
  };

  const getActionInfo = (accion) => {
    switch (accion) {
      case 'CREACIÓN': return { clase: 'historial-accion-creacion', Icono: FaPlusCircle };
      case 'EDICIÓN': return { clase: 'historial-accion-edicion', Icono: FaEdit };
      case 'ELIMINACIÓN': return { clase: 'historial-accion-eliminacion', Icono: FaTrashAlt };
      default: return { clase: '', Icono: FaHistory };
    }
  };

  const getInitials = (email) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="historial-modal-overlay" onClick={onClose}>
      <div className="historial-modal" onClick={e => e.stopPropagation()}>
        <div className="historial-modal-header">
          <h2>
            <FaHistory className="historial-header-icon" /> 
            Registro de Auditoría
          </h2>
          <button className="historial-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="historial-modal-content">
          {cargando ? (
            <div className="historial-loading">
              <FaSpinner className="fa-spin" style={{ fontSize: '2rem', color: '#3b82f6' }} />
              Cargando registros...
            </div>
          ) : historial.length === 0 ? (
            <div className="historial-empty">
              <FaHistory style={{ fontSize: '2.5rem', opacity: 0.5 }} />
              No hay registros recientes en el sistema.
            </div>
          ) : (
            <table className="historial-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Detalles del Cambio</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((registro) => {
                  const { dia, hora } = formatearFechaObj(registro.fecha);
                  const { clase, Icono } = getActionInfo(registro.accion);
                  
                  return (
                    <tr key={registro.id}>
                      <td>
                        <div className="fecha-celda">
                          <span className="fecha-dia">{dia}</span>
                          <span className="fecha-hora">{hora}</span>
                        </div>
                      </td>
                      <td>
                        <div className="historial-user">
                          <div className="user-avatar" title={registro.usuario}>
                            {getInitials(registro.usuario)}
                          </div>
                          <span style={{ fontSize: '0.85rem' }}>{registro.usuario?.split('@')[0]}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`historial-badge ${clase}`}>
                          <Icono /> {registro.accion}
                        </span>
                      </td>
                      <td className="historial-details">
                        {registro.detalles && typeof registro.detalles === 'object' ? (
                          <div className="historial-details-box">
                            <ul className="historial-details-list">
                              {Object.entries(registro.detalles).map(([key, value]) => (
                                <li key={key}>
                                  <strong>{key}:</strong> <span>{String(value)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            {registro.detalles || 'Sin detalles adicionales'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialCuentas;
