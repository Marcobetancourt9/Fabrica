import React, { useState, useEffect } from 'react';
import { db, auth } from '../../credentials';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './TotalDeudas.css';

const TotalDeudas = () => {
  const [proveedores, setProveedores] = useState([]);
  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: '',
    saldo: '',
    pagos: '',
    pendiente: ''
  });
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [errores, setErrores] = useState({});
  const [usuarioActual, setUsuarioActual] = useState(null);

  // Listener para el usuario autenticado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuarioActual(user);
    });
    return () => unsub();
  }, []);

  // Cargar proveedores desde Firebase
  useEffect(() => {
    const cargarProveedores = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedores'));
        const proveedoresData = [];
        querySnapshot.forEach((doc) => {
          proveedoresData.push({ id: doc.id, ...doc.data() });
        });
        setProveedores(proveedoresData);
        setCargando(false);
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
        setCargando(false);
      }
    };

    cargarProveedores();
  }, []);

  // Validar que los pagos no excedan el saldo
  const validarPagos = (saldo, pagos) => {
    const saldoNum = parseFloat(saldo) || 0;
    const pagosNum = parseFloat(pagos) || 0;
    
    if (pagosNum > saldoNum) {
      return "Los pagos no pueden ser mayores al saldo";
    }
    return null;
  };

  // Calcular saldo pendiente automáticamente
  useEffect(() => {
    const saldo = parseFloat(nuevoProveedor.saldo) || 0;
    const pagos = parseFloat(nuevoProveedor.pagos) || 0;
    
    // Validar pagos
    const errorPagos = validarPagos(saldo, pagos);
    if (errorPagos) {
      setErrores({...errores, pagos: errorPagos});
    } else {
      setErrores({...errores, pagos: null});
    }
    
    setNuevoProveedor({
      ...nuevoProveedor,
      pendiente: (saldo - pagos).toFixed(2)
    });
  }, [nuevoProveedor.saldo, nuevoProveedor.pagos]);

  // Agregar nuevo proveedor
  const agregarProveedor = async () => {
    if (!nuevoProveedor.nombre.trim()) {
      setErrores({...errores, nombre: "El nombre es obligatorio"});
      return;
    }
    
    const saldo = parseFloat(nuevoProveedor.saldo) || 0;
    const pagos = parseFloat(nuevoProveedor.pagos) || 0;
    
    // Validar pagos antes de agregar
    const errorPagos = validarPagos(saldo, pagos);
    if (errorPagos) {
      setErrores({...errores, pagos: errorPagos});
      return;
    }
    
    try {
      const pendiente = saldo - pagos;

      const timestamp = new Date().toISOString();
      const editorNombre = usuarioActual ? (usuarioActual.displayName || usuarioActual.email) : 'Anónimo';
      const editorEmail = usuarioActual ? usuarioActual.email : '';

      const docRef = await addDoc(collection(db, 'proveedores'), {
        nombre: nuevoProveedor.nombre,
        saldo: saldo,
        pagos: pagos,
        pendiente: pendiente,
        editadoPor: editorNombre,
        editadoEmail: editorEmail,
        timestampEdicion: timestamp
      });
      
      setProveedores([...proveedores, { 
        id: docRef.id, 
        nombre: nuevoProveedor.nombre, 
        saldo: saldo, 
        pagos: pagos,
        pendiente: pendiente,
        editadoPor: editorNombre,
        editadoEmail: editorEmail,
        timestampEdicion: timestamp
      }]);
      
      setNuevoProveedor({ nombre: '', saldo: '', pagos: '', pendiente: '' });
      setMostrarFormulario(false);
      setErrores({});
    } catch (error) {
      console.error('Error al agregar proveedor:', error);
    }
  };

  // Eliminar proveedor
  const eliminarProveedor = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este proveedor?')) return;
    
    try {
      await deleteDoc(doc(db, 'proveedores', id));
      setProveedores(proveedores.filter(proveedor => proveedor.id !== id));
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
    }
  };

  // Actualizar proveedor
  const actualizarProveedor = async (id) => {
    try {
      const proveedorActualizado = proveedores.find(p => p.id === id);
      
      // Validar pagos antes de actualizar
      const saldo = parseFloat(proveedorActualizado.saldo || 0);
      const pagos = parseFloat(proveedorActualizado.pagos || 0);
      
      const errorPagos = validarPagos(saldo, pagos);
      if (errorPagos) {
        alert(errorPagos);
        return;
      }
      
      const pendiente = saldo - pagos;
      
      const timestamp = new Date().toISOString();
      const editorNombre = usuarioActual ? (usuarioActual.displayName || usuarioActual.email) : 'Anónimo';
      const editorEmail = usuarioActual ? usuarioActual.email : '';
      
      await updateDoc(doc(db, 'proveedores', id), {
        nombre: proveedorActualizado.nombre,
        saldo: saldo,
        pagos: pagos,
        pendiente: pendiente,
        editadoPor: editorNombre,
        editadoEmail: editorEmail,
        timestampEdicion: timestamp
      });
      
      // Actualizar el estado local con el pendiente y auditoría recalculada
      setProveedores(proveedores.map(p => 
        p.id === id ? {
          ...p, 
          pendiente: pendiente,
          editadoPor: editorNombre,
          editadoEmail: editorEmail,
          timestampEdicion: timestamp
        } : p
      ));
      
      setEditandoId(null);
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
    }
  };

  // Manejar cambios en edición con validación
  const manejarCambioEdicion = (id, campo, valor) => {
    const nuevosProveedores = proveedores.map(p => 
      p.id === id ? {...p, [campo]: valor} : p
    );
    
    // Si estamos cambiando saldo o pagos, validar
    if (campo === 'saldo' || campo === 'pagos') {
      const proveedor = nuevosProveedores.find(p => p.id === id);
      const saldo = parseFloat(proveedor.saldo || 0);
      const pagos = parseFloat(proveedor.pagos || 0);
      
      // Si los pagos exceden el saldo, ajustar automáticamente
      if (campo === 'pagos' && pagos > saldo) {
        // No permitir que pagos sea mayor que saldo
        return;
      }
    }
    
    setProveedores(nuevosProveedores);
  };

  // Filtrar proveedores por búsqueda
  const proveedoresFiltrados = proveedores.filter(proveedor =>
    proveedor.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Calcular totales
  const totalSaldo = proveedores.reduce((total, proveedor) => total + parseFloat(proveedor.saldo || 0), 0);
  const totalPagos = proveedores.reduce((total, proveedor) => total + parseFloat(proveedor.pagos || 0), 0);
  const totalPendiente = proveedores.reduce((total, proveedor) => total + parseFloat(proveedor.pendiente || 0), 0);

  if (cargando) {
    return (
      <div className="cargando-container">
        <div className="cargando-spinner"></div>
        <p>Cargando proveedores...</p>
      </div>
    );
  }

  // Formatear Fecha
  const formatearFechaEdicion = (isoString) => {
    if (!isoString) return 'Nunca';
    const fecha = new Date(isoString);
    return `${fecha.toLocaleDateString()} a las ${fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <div className="total-deudas-container">
      <br />
      <header className="app-header">
        <h1>💰 Control de Deudas con Proveedores</h1>
        <p>Gestiona los saldos y pagos a tus proveedores</p>
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
        
        {usuarioActual ? (
          <button 
            className="btn-primario"
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
          >
            {mostrarFormulario ? 'Cancelar' : '+ Nuevo Proveedor'}
          </button>
        ) : (
          <div className="mensaje-bloqueo">
            🔒 Inicia sesión para gestionar deudas
          </div>
        )}
      </div>
      
      {/* Formulario para agregar proveedor */}
      {mostrarFormulario && (
        <div className="formulario-proveedor">
          <h2>Agregar Nuevo Proveedor</h2>
          
          <div className="campos-formulario">
            <div className="input-group">
              <label>Nombre del proveedor</label>
              <input
                type="text"
                value={nuevoProveedor.nombre}
                onChange={(e) => {
                  setNuevoProveedor({...nuevoProveedor, nombre: e.target.value});
                  if (e.target.value.trim()) {
                    setErrores({...errores, nombre: null});
                  }
                }}
                className={errores.nombre ? 'error' : ''}
              />
              {errores.nombre && <span className="mensaje-error">{errores.nombre}</span>}
            </div>
            
            <div className="input-group">
              <label>Saldo inicial ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={nuevoProveedor.saldo}
                onChange={(e) => {
                  const valor = e.target.value;
                  // No permitir valores negativos
                  if (valor >= 0) {
                    setNuevoProveedor({...nuevoProveedor, saldo: valor});
                  }
                }}
              />
            </div>
            
            <div className="input-group">
              <label>Pagos realizados ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={nuevoProveedor.saldo || 0}
                value={nuevoProveedor.pagos}
                onChange={(e) => {
                  const valor = e.target.value;
                  const saldo = parseFloat(nuevoProveedor.saldo) || 0;
                  const pagosNum = valor === '' ? 0 : parseFloat(valor);
                  
                  if (pagosNum <= saldo) {
                    setNuevoProveedor({...nuevoProveedor, pagos: valor});
                  }
                }}
                className={errores.pagos ? 'error' : ''}
              />
              {errores.pagos && <span className="mensaje-error">{errores.pagos}</span>}
            </div>
            
            <div className="input-group">
              <label>Saldo pendiente ($)</label>
              <input
                type="number"
                step="0.01"
                value={nuevoProveedor.pendiente}
                readOnly
                className="campo-solo-lectura"
              />
            </div>
            
            <button className="btn-agregar" onClick={agregarProveedor}>
              Agregar Proveedor
            </button>
          </div>
        </div>
      )}
      
      {/* Tabla de proveedores */}
      <div className="tabla-container">
        <table className="tabla-proveedores">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Saldo ($)</th>
              <th>Pagos ($)</th>
              <th>Saldo Pendiente ($)</th>
              <th>Última Edición</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="sin-resultados">
                  {busqueda ? 'No se encontraron proveedores con ese nombre' : 'No hay proveedores registrados'}
                </td>
              </tr>
            ) : (
              proveedoresFiltrados.map((proveedor) => (
                <tr key={proveedor.id} className={editandoId === proveedor.id ? 'editando' : ''}>
                  <td>
                    {editandoId === proveedor.id ? (
                      <input
                        type="text"
                        value={proveedor.nombre}
                        onChange={(e) => {
                          manejarCambioEdicion(proveedor.id, 'nombre', e.target.value);
                        }}
                      />
                    ) : (
                      <div className="nombre-proveedor">
                        <span className="avatar">{proveedor.nombre.charAt(0).toUpperCase()}</span>
                        {proveedor.nombre}
                      </div>
                    )}
                  </td>
                  <td>
                    {editandoId === proveedor.id ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={proveedor.saldo}
                        onChange={(e) => {
                          const valor = e.target.value;
                          if (valor === '' || parseFloat(valor) >= 0) {
                            manejarCambioEdicion(proveedor.id, 'saldo', valor);
                          }
                        }}
                      />
                    ) : (
                      <span className={`monto ${parseFloat(proveedor.saldo) > 0 ? 'positivo' : ''}`}>
                        ${parseFloat(proveedor.saldo || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                  <td>
                    {editandoId === proveedor.id ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={proveedor.saldo || 0}
                        value={proveedor.pagos}
                        onChange={(e) => {
                          const valor = e.target.value;
                          const saldo = parseFloat(proveedor.saldo) || 0;
                          const pagosNum = valor === '' ? 0 : parseFloat(valor);
                          
                          if (pagosNum <= saldo) {
                            manejarCambioEdicion(proveedor.id, 'pagos', valor);
                          }
                        }}
                      />
                    ) : (
                      <span className="monto negativo">
                        ${parseFloat(proveedor.pagos || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`monto ${parseFloat(proveedor.pendiente || 0) > 0 ? 'saldo-pendiente' : 'saldo-cero'}`}>
                      ${parseFloat(proveedor.pendiente || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="celda-edicion">
                    <div className="info-edicion">
                      <span className="edicion-nombre">Editado por: {proveedor.editadoPor || 'Autor Desconocido'}</span>
                      {proveedor.editadoEmail && <span className="edicion-email">({proveedor.editadoEmail})</span>}
                      <span className="edicion-fecha">{formatearFechaEdicion(proveedor.timestampEdicion)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="acciones">
                      {editandoId === proveedor.id ? (
                        <>
                          <button className="btn-guardar" onClick={() => actualizarProveedor(proveedor.id)}>💾</button>
                          <button className="btn-cancelar" onClick={() => setEditandoId(null)}>❌</button>
                        </>
                      ) : usuarioActual ? (
                        <>
                          <button className="btn-editar" onClick={() => setEditandoId(proveedor.id)}>✏️</button>
                          <button className="btn-eliminar" onClick={() => eliminarProveedor(proveedor.id)}>🗑️</button>
                        </>
                      ) : (
                         <span style={{ fontSize: '0.8rem', opacity: 0.6, color: '#cbd5e1' }}>🔒</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          
          {/* Totales */}
          <tfoot>
            <tr className="total-fila">
              <td>Total cpx proveedores</td>
              <td>${totalSaldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>${totalPagos.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className={totalPendiente > 0 ? 'total-pendiente' : 'total-cero'}>
                ${totalPendiente.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TotalDeudas;