import React, { useState, useEffect } from 'react';
import { db } from '../../credentials';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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

  // Calcular saldo pendiente automáticamente
  useEffect(() => {
    const saldo = parseFloat(nuevoProveedor.saldo) || 0;
    const pagos = parseFloat(nuevoProveedor.pagos) || 0;
    setNuevoProveedor({
      ...nuevoProveedor,
      pendiente: (saldo - pagos).toFixed(2)
    });
  }, [nuevoProveedor.saldo, nuevoProveedor.pagos]);

  // Agregar nuevo proveedor
  const agregarProveedor = async () => {
    if (!nuevoProveedor.nombre.trim()) return;
    
    try {
      const saldo = parseFloat(nuevoProveedor.saldo) || 0;
      const pagos = parseFloat(nuevoProveedor.pagos) || 0;
      const pendiente = saldo - pagos;

      const docRef = await addDoc(collection(db, 'proveedores'), {
        nombre: nuevoProveedor.nombre,
        saldo: saldo,
        pagos: pagos,
        pendiente: pendiente
      });
      
      setProveedores([...proveedores, { 
        id: docRef.id, 
        nombre: nuevoProveedor.nombre, 
        saldo: saldo, 
        pagos: pagos,
        pendiente: pendiente
      }]);
      
      setNuevoProveedor({ nombre: '', saldo: '', pagos: '', pendiente: '' });
      setMostrarFormulario(false);
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
      // Recalcular el pendiente antes de guardar
      const saldo = parseFloat(proveedorActualizado.saldo || 0);
      const pagos = parseFloat(proveedorActualizado.pagos || 0);
      const pendiente = saldo - pagos;
      
      await updateDoc(doc(db, 'proveedores', id), {
        nombre: proveedorActualizado.nombre,
        saldo: saldo,
        pagos: pagos,
        pendiente: pendiente
      });
      
      // Actualizar el estado local con el pendiente recalculado
      setProveedores(proveedores.map(p => 
        p.id === id ? {...p, pendiente: pendiente} : p
      ));
      
      setEditandoId(null);
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
    }
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

  return (
    <div className="total-deudas-container">
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
        
        <button 
          className="btn-primario"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo Proveedor'}
        </button>
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
                onChange={(e) => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label>Saldo inicial ($)</label>
              <input
                type="number"
                step="0.01"
                value={nuevoProveedor.saldo}
                onChange={(e) => setNuevoProveedor({...nuevoProveedor, saldo: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label>Pagos realizados ($)</label>
              <input
                type="number"
                step="0.01"
                value={nuevoProveedor.pagos}
                onChange={(e) => setNuevoProveedor({...nuevoProveedor, pagos: e.target.value})}
              />
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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan="5" className="sin-resultados">
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
                          const nuevosProveedores = proveedores.map(p => 
                            p.id === proveedor.id ? {...p, nombre: e.target.value} : p
                          );
                          setProveedores(nuevosProveedores);
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
                        value={proveedor.saldo}
                        onChange={(e) => {
                          const nuevosProveedores = proveedores.map(p => 
                            p.id === proveedor.id ? {...p, saldo: e.target.value} : p
                          );
                          setProveedores(nuevosProveedores);
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
                        value={proveedor.pagos}
                        onChange={(e) => {
                          const nuevosProveedores = proveedores.map(p => 
                            p.id === proveedor.id ? {...p, pagos: e.target.value} : p
                          );
                          setProveedores(nuevosProveedores);
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
                  <td>
                    <div className="acciones">
                      {editandoId === proveedor.id ? (
                        <>
                          <button className="btn-guardar" onClick={() => actualizarProveedor(proveedor.id)}>💾</button>
                          <button className="btn-cancelar" onClick={() => setEditandoId(null)}>❌</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-editar" onClick={() => setEditandoId(proveedor.id)}>✏️</button>
                          <button className="btn-eliminar" onClick={() => eliminarProveedor(proveedor.id)}>🗑️</button>
                        </>
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
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TotalDeudas;