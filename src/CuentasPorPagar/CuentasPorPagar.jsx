import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../credentials';
import './CuentasPorPagar.css';

const CuentasPorPagar = () => {
  const [proveedores, setProveedores] = useState([]);
  const [nuevoProveedor, setNuevoProveedor] = useState({ 
    nombre: '', 
    deudas: [] 
  });
  const [filtro, setFiltro] = useState('');
  const [semanaFiltro, setSemanaFiltro] = useState('');
  const [semanas, setSemanas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaSemana, setNuevaSemana] = useState({ inicio: '', fin: '' });
  const [editandoDeuda, setEditandoDeuda] = useState(null);
  const [valorEditado, setValorEditado] = useState('');
  const [editandoPago, setEditandoPago] = useState(null);
  const [valorPagoEditado, setValorPagoEditado] = useState('');

  // Generar semanas para 2025
  function generarSemanas2025() {
    const semanas = [];
    let fechaInicio = new Date(2025, 0, 1); // 01/01/2025
    const fechaFin = new Date(2025, 11, 31); // 31/12/2025
    
    while (fechaInicio <= fechaFin) {
      const inicioSemana = new Date(fechaInicio);
      const finSemana = new Date(fechaInicio);
      finSemana.setDate(finSemana.getDate() + 6);
      
      if (finSemana > fechaFin) {
        finSemana.setTime(fechaFin.getTime());
      }
      
      const formatoFecha = (fecha) => {
        return fecha.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      };
      
      semanas.push({
        inicio: formatoFecha(inicioSemana),
        fin: formatoFecha(finSemana),
        key: `${formatoFecha(inicioSemana)}-${formatoFecha(finSemana)}`
      });
      
      fechaInicio.setDate(fechaInicio.getDate() + 7);
    }
    
    return semanas;
  }

  // Cargar proveedores y semanas desde Firebase
  useEffect(() => {
    const cargarTodo = async () => {
      try {
        // Cargar proveedores
        const querySnapshot = await getDocs(collection(db, 'por_pagar'));
        const proveedoresData = [];
        querySnapshot.forEach((docSnap) => {
          proveedoresData.push({ id: docSnap.id, ...docSnap.data() });
        });
        setProveedores(proveedoresData);

        // Cargar semanas desde configuración
        const configRef = doc(db, 'configuracion', 'semanas_por_pagar');
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          setSemanas(configSnap.data().lista || []);
        } else {
          // Inicializar por primera vez con datos del 2025
          const semanasIniciales = generarSemanas2025();
          await setDoc(configRef, {
            lista: semanasIniciales,
            inicializado: true
          });
          setSemanas(semanasIniciales);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };

    cargarTodo();
  }, []);

  // Agregar nuevo proveedor
  const agregarProveedor = async () => {
    if (!nuevoProveedor.nombre.trim()) {
      alert('Por favor ingrese un nombre para el proveedor');
      return;
    }
    
    try {
      // Inicializar deudas para todas las semanas con monto como string vacío
      const deudasInicializadas = semanas.map(semana => ({
        semana: semana.key,
        monto: '', // Inicializar como string vacío en lugar de 0
        pagado: 0, // Cambiado a número para representar el monto pagado
        pagadoCompleto: false // Para saber si se marcó como pagado completamente
      }));
      
      const proveedorConDeudas = {
        nombre: nuevoProveedor.nombre,
        deudas: deudasInicializadas
      };
      
      const docRef = await addDoc(collection(db, 'por_pagar'), proveedorConDeudas);
      setProveedores([...proveedores, { id: docRef.id, ...proveedorConDeudas }]);
      setNuevoProveedor({ nombre: '', deudas: [] });
    } catch (error) {
      console.error('Error agregando proveedor:', error);
    }
  };

  // Eliminar proveedor
  const eliminarProveedor = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este proveedor?')) {
      try {
        await deleteDoc(doc(db, 'por_pagar', id));
        setProveedores(proveedores.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error eliminando proveedor:', error);
      }
    }
  };

  // Eliminar semana
  const eliminarSemana = async (semanaKey) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta semana permanentemente? Se borrará de la base de datos.')) {
      const nuevasSemanas = semanas.filter(s => s.key !== semanaKey);
      setSemanas(nuevasSemanas);
      
      // Actualizar todos los proveedores localmente
      const proveedoresActualizados = proveedores.map(proveedor => ({
        ...proveedor,
        deudas: proveedor.deudas.filter(d => d.semana !== semanaKey)
      }));
      setProveedores(proveedoresActualizados);
      
      try {
        // Actualizar semanas persistentes en Firebase
        await updateDoc(doc(db, 'configuracion', 'semanas_por_pagar'), {
          lista: nuevasSemanas
        });

        // Actualizar proveedores en Firebase
        proveedoresActualizados.forEach(async (proveedor) => {
          await updateDoc(doc(db, 'por_pagar', proveedor.id), {
            deudas: proveedor.deudas
          });
        });
      } catch (error) {
        console.error('Error sincronizando eliminación de semana:', error);
      }
    }
  };

  // Actualizar estado de pago completo
  const actualizarPagoCompleto = async (proveedorId, semanaKey, pagadoCompleto) => {
    try {
      const proveedor = proveedores.find(p => p.id === proveedorId);
      const deuda = proveedor.deudas.find(d => d.semana === semanaKey);
      
      const deudasActualizadas = proveedor.deudas.map(deuda => 
        deuda.semana === semanaKey ? { 
          ...deuda, 
          pagadoCompleto,
          pagado: pagadoCompleto ? (parseFloat(deuda.monto) || 0) : deuda.pagado
        } : deuda
      );
      
      await updateDoc(doc(db, 'por_pagar', proveedorId), {
        deudas: deudasActualizadas
      });
      
      setProveedores(proveedores.map(p => 
        p.id === proveedorId ? { ...p, deudas: deudasActualizadas } : p
      ));
    } catch (error) {
      console.error('Error actualizando pago completo:', error);
    }
  };

  // Actualizar monto de deuda
  const actualizarDeuda = async (proveedorId, semanaKey, monto) => {
    try {
      const proveedor = proveedores.find(p => p.id === proveedorId);
      const montoNumerico = monto === '' ? '' : parseFloat(monto) || 0;
      
      const deudasActualizadas = proveedor.deudas.map(deuda => 
        deuda.semana === semanaKey ? { 
          ...deuda, 
          monto: montoNumerico,
          pagado: deuda.pagadoCompleto ? montoNumerico : deuda.pagado
        } : deuda
      );
      
      await updateDoc(doc(db, 'por_pagar', proveedorId), {
        deudas: deudasActualizadas
      });
      
      setProveedores(proveedores.map(p => 
        p.id === proveedorId ? { ...p, deudas: deudasActualizadas } : p
      ));
      
      setEditandoDeuda(null);
    } catch (error) {
      console.error('Error actualizando deuda:', error);
    }
  };

  // Actualizar monto pagado
  const actualizarPago = async (proveedorId, semanaKey, pago) => {
    try {
      const proveedor = proveedores.find(p => p.id === proveedorId);
      const pagoNumerico = pago === '' ? 0 : parseFloat(pago) || 0;
      const deuda = proveedor.deudas.find(d => d.semana === semanaKey);
      const montoDeuda = parseFloat(deuda.monto) || 0;
      
      const deudasActualizadas = proveedor.deudas.map(deuda => 
        deuda.semana === semanaKey ? { 
          ...deuda, 
          pagado: pagoNumerico,
          pagadoCompleto: pagoNumerico >= montoDeuda
        } : deuda
      );
      
      await updateDoc(doc(db, 'por_pagar', proveedorId), {
        deudas: deudasActualizadas
      });
      
      setProveedores(proveedores.map(p => 
        p.id === proveedorId ? { ...p, deudas: deudasActualizadas } : p
      ));
      
      setEditandoPago(null);
    } catch (error) {
      console.error('Error actualizando pago:', error);
    }
  };

  // Agregar nueva semana
  const agregarSemana = async () => {
    if (!nuevaSemana.inicio || !nuevaSemana.fin) {
      alert('Por favor ingrese ambas fechas');
      return;
    }
    
    const regexFecha = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regexFecha.test(nuevaSemana.inicio) || !regexFecha.test(nuevaSemana.fin)) {
      alert('Formato de fecha inválido. Use dd/mm/aaaa');
      return;
    }
    
    const nuevaSemanaKey = `${nuevaSemana.inicio}-${nuevaSemana.fin}`;
    
    if (semanas.some(s => s.key === nuevaSemanaKey)) {
      alert('Esta semana ya existe');
      return;
    }
    
    const semana = {
      inicio: nuevaSemana.inicio,
      fin: nuevaSemana.fin,
      key: nuevaSemanaKey
    };
    
    setSemanas([...semanas, semana]);
    
    // Actualizar todos los proveedores con la nueva semana
    const proveedoresActualizados = proveedores.map(proveedor => ({
      ...proveedor,
      deudas: [
        ...proveedor.deudas,
        { semana: semana.key, monto: '', pagado: 0, pagadoCompleto: false }
      ]
    }));
    
    setProveedores(proveedoresActualizados);
    
    // Actualizar en Firebase
    try {
      // Registrar nueva semana en la BD global
      await updateDoc(doc(db, 'configuracion', 'semanas_por_pagar'), {
        lista: [...semanas, semana]
      });

      proveedoresActualizados.forEach(async (proveedor) => {
        await updateDoc(doc(db, 'por_pagar', proveedor.id), {
          deudas: proveedor.deudas
        });
      });
    } catch (error) {
      console.error('Error sincronizando adición de semana:', error);
    }
    
    setNuevaSemana({ inicio: '', fin: '' });
    setMostrarModal(false);
  };

  // Filtrar proveedores
  const proveedoresFiltrados = proveedores.filter(proveedor => {
    const coincideNombre = proveedor.nombre.toLowerCase().includes(filtro.toLowerCase());
    
    if (!semanaFiltro) return coincideNombre;
    
    const tieneDeudaEnSemana = proveedor.deudas.some(deuda => 
      deuda.semana === semanaFiltro
    );
    
    return coincideNombre && tieneDeudaEnSemana;
  });

  // Calcular saldo pendiente por semana
  const calcularSaldoPendiente = (deuda) => {
    const monto = parseFloat(deuda.monto) || 0;
    const pagado = parseFloat(deuda.pagado) || 0;
    return Math.max(0, monto - pagado);
  };

  // Calcular total por proveedor
  const calcularTotalProveedor = (proveedor) => {
    return proveedor.deudas.reduce((total, deuda) => {
      return total + (parseFloat(deuda.monto) || 0);
    }, 0);
  };

  // Calcular total pagado por proveedor
  const calcularTotalPagado = (proveedor) => {
    return proveedor.deudas.reduce((total, deuda) => {
      return total + (parseFloat(deuda.pagado) || 0);
    }, 0);
  };

  // Calcular saldo pendiente por proveedor
  const calcularSaldoPendienteProveedor = (proveedor) => {
    return calcularTotalProveedor(proveedor) - calcularTotalPagado(proveedor);
  };

  // Calcular total general
  const calcularTotalGeneral = () => {
    return proveedores.reduce((total, proveedor) => {
      return total + calcularTotalProveedor(proveedor);
    }, 0);
  };

  // Calcular total pagado general
  const calcularTotalPagadoGeneral = () => {
    return proveedores.reduce((total, proveedor) => {
      return total + calcularTotalPagado(proveedor);
    }, 0);
  };

  // Calcular saldo pendiente general
  const calcularSaldoPendienteGeneral = () => {
    return calcularTotalGeneral() - calcularTotalPagadoGeneral();
  };

  // Iniciar edición de deuda
  const iniciarEdicionDeuda = (proveedorId, semanaKey, monto) => {
    setEditandoDeuda({ proveedorId, semanaKey });
    setValorEditado(monto === 0 ? '' : (monto || '').toString());
  };

  // Iniciar edición de pago
  const iniciarEdicionPago = (proveedorId, semanaKey, pago) => {
    setEditandoPago({ proveedorId, semanaKey });
    setValorPagoEditado(pago === 0 ? '' : (pago || '').toString());
  };

  // Guardar edición de deuda
  const guardarEdicionDeuda = () => {
    if (editandoDeuda) {
      actualizarDeuda(editandoDeuda.proveedorId, editandoDeuda.semanaKey, valorEditado);
    }
  };

  // Guardar edición de pago
  const guardarEdicionPago = () => {
    if (editandoPago) {
      actualizarPago(editandoPago.proveedorId, editandoPago.semanaKey, valorPagoEditado);
    }
  };

  // Cancelar edición de deuda
  const cancelarEdicionDeuda = () => {
    setEditandoDeuda(null);
    setValorEditado('');
  };

  // Cancelar edición de pago
  const cancelarEdicionPago = () => {
    setEditandoPago(null);
    setValorPagoEditado('');
  };

  // Formatear monto para mostrar
  const formatearMonto = (monto) => {
    if (monto === '' || monto === null || monto === undefined) return '-';
    if (typeof monto === 'string' && monto.trim() === '') return '-';
    return `$${parseFloat(monto).toLocaleString()}`;
  };

  return (
    <div className="cuentas-por-pagar">
    <br />
      {/* Header minimalista que complementa el menú principal */}
      <div className="page-header">
        <h1>Cuentas por Pagar</h1>
        <p>Gestión de deudas a proveedores por semana - 2025</p>
      </div>
      
      {/* Controles */}
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
              {semanas.map(semana => (
                <option key={semana.key} value={semana.key}>
                  {semana.inicio} - {semana.fin}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="acciones">
          <div className="nuevo-proveedor">
            <input
              type="text"
              placeholder="Nombre del proveedor"
              value={nuevoProveedor.nombre}
              onChange={(e) => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})}
            />
            <button className="btn btn-primary" onClick={agregarProveedor}>
              Agregar Proveedor
            </button>
          </div>
          
          <button className="btn btn-secondary" onClick={() => setMostrarModal(true)}>
            Agregar Semana
          </button>
        </div>
      </div>
      
      {/* Modal para agregar semana */}
      {mostrarModal && (
        <div className="modal">
          <div className="modal-contenido">
            <h3>Agregar Nueva Semana</h3>
            <div className="modal-inputs">
              <div className="input-group">
                <label>Fecha de inicio (dd/mm/aaaa):</label>
                <input
                  type="text"
                  placeholder="01/01/2025"
                  value={nuevaSemana.inicio}
                  onChange={(e) => setNuevaSemana({...nuevaSemana, inicio: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Fecha de fin (dd/mm/aaaa):</label>
                <input
                  type="text"
                  placeholder="07/01/2025"
                  value={nuevaSemana.fin}
                  onChange={(e) => setNuevaSemana({...nuevaSemana, fin: e.target.value})}
                />
              </div>
            </div>
            <div className="modal-botones">
              <button className="btn btn-primary" onClick={agregarSemana}>
                Agregar
              </button>
              <button className="btn btn-cancelar" onClick={() => setMostrarModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Resumen */}
      <div className="resumen">
        <div className="resumen-item">
          <span className="resumen-label">Proveedores:</span>
          <span className="resumen-valor">{proveedores.length}</span>
        </div>
        <div className="resumen-item">
          <span className="resumen-label">Semanas:</span>
          <span className="resumen-valor">{semanas.length}</span>
        </div>
        <div className="resumen-item">
          <span className="resumen-label">Total a Pagar:</span>
          <span className="resumen-valor">${calcularTotalGeneral().toLocaleString()}</span>
        </div>
        <div className="resumen-item">
          <span className="resumen-label">Total Pagado:</span>
          <span className="resumen-valor">${calcularTotalPagadoGeneral().toLocaleString()}</span>
        </div>
        <div className="resumen-item total">
          <span className="resumen-label">Saldo Pendiente:</span>
          <span className="resumen-valor">${calcularSaldoPendienteGeneral().toLocaleString()}</span>
        </div>
      </div>
      
      {/* Tabla de proveedores */}
      <div className="tabla-container">
        <table className="tabla-proveedores">
          <thead>
            <tr>
              <th className="proveedor-header">Proveedor</th>
              {semanas.map(semana => (
                <th key={semana.key} className="semana-header">
                  <div className="semana-titulo">
                    <span>{semana.inicio}</span>
                    <span>a</span>
                    <span>{semana.fin}</span>
                  </div>
                  <button 
                    className="btn-eliminar-semana"
                    onClick={() => eliminarSemana(semana.key)}
                    title="Eliminar semana"
                  >
                    ✕
                  </button>
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
                  <td className="proveedor-nombre">{proveedor.nombre}</td>
                  {semanas.map(semana => {
                    const deuda = proveedor.deudas.find(d => d.semana === semana.key) || { monto: '', pagado: 0, pagadoCompleto: false };
                    const estaEditandoDeuda = editandoDeuda && 
                                             editandoDeuda.proveedorId === proveedor.id && 
                                             editandoDeuda.semanaKey === semana.key;
                    const estaEditandoPago = editandoPago && 
                                            editandoPago.proveedorId === proveedor.id && 
                                            editandoPago.semanaKey === semana.key;
                    const saldoPendiente = calcularSaldoPendiente(deuda);
                    
                    return (
                      <td key={semana.key} className={deuda.pagadoCompleto ? 'deuda pagado' : 'deuda'}>
                        <div className="contenido-deuda">
                          <div className="monto-section">
                            <div className="monto-label">Deuda:</div>
                            {estaEditandoDeuda ? (
                              <div className="edicion-deuda">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={valorEditado}
                                  onChange={(e) => setValorEditado(e.target.value)}
                                  autoFocus
                                  className="input-edicion"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') guardarEdicionDeuda();
                                    if (e.key === 'Escape') cancelarEdicionDeuda();
                                  }}
                                  placeholder="0.00"
                                />
                                <div className="controles-edicion">
                                  <button 
                                    className="btn-guardar"
                                    onClick={guardarEdicionDeuda}
                                    title="Guardar"
                                  >
                                    ✓
                                  </button>
                                  <button 
                                    className="btn-cancelar"
                                    onClick={cancelarEdicionDeuda}
                                    title="Cancelar"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="monto-deuda"
                                onClick={() => iniciarEdicionDeuda(proveedor.id, semana.key, deuda.monto)}
                              >
                                {formatearMonto(deuda.monto)}
                              </div>
                            )}
                          </div>
                          
                          <div className="pago-section">
                            <div className="pago-label">Pagado:</div>
                            {estaEditandoPago ? (
                              <div className="edicion-pago">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={valorPagoEditado}
                                  onChange={(e) => setValorPagoEditado(e.target.value)}
                                  autoFocus
                                  className="input-edicion"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') guardarEdicionPago();
                                    if (e.key === 'Escape') cancelarEdicionPago();
                                  }}
                                  placeholder="0.00"
                                />
                                <div className="controles-edicion">
                                  <button 
                                    className="btn-guardar"
                                    onClick={guardarEdicionPago}
                                    title="Guardar"
                                  >
                                    ✓
                                  </button>
                                  <button 
                                    className="btn-cancelar"
                                    onClick={cancelarEdicionPago}
                                    title="Cancelar"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="monto-pagado"
                                onClick={() => iniciarEdicionPago(proveedor.id, semana.key, deuda.pagado)}
                              >
                                {formatearMonto(deuda.pagado)}
                              </div>
                            )}
                          </div>
                          
                          <div className="saldo-section">
                            <div className="saldo-label">Saldo:</div>
                            <div className="saldo-pendiente">
                              {formatearMonto(saldoPendiente)}
                            </div>
                          </div>
                          
                          <label className="checkbox-pagado">
                            <input
                              type="checkbox"
                              checked={deuda.pagadoCompleto}
                              onChange={(e) => actualizarPagoCompleto(proveedor.id, semana.key, e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            Pagado completo
                          </label>
                        </div>
                      </td>
                    );
                  })}
                  <td className="total-proveedor">
                    <div className="total-monto">
                      ${calcularTotalProveedor(proveedor).toLocaleString()}
                    </div>
                  </td>
                  <td className="total-pagado">
                    <div className="total-monto">
                      ${calcularTotalPagado(proveedor).toLocaleString()}
                    </div>
                  </td>
                  <td className="saldo-pendiente">
                    <div className="total-monto">
                      ${calcularSaldoPendienteProveedor(proveedor).toLocaleString()}
                    </div>
                  </td>
                  <td className="acciones">
                    <button 
                      className="btn btn-eliminar"
                      onClick={() => eliminarProveedor(proveedor.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={semanas.length + 4} className="sin-resultados">
                  {proveedores.length === 0 ? 'No hay proveedores registrados' : 'No se encontraron resultados'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CuentasPorPagar;