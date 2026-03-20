import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../credentials';
import './Pedidos.css';

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [pedidoIdEditar, setPedidoIdEditar] = useState(null);

  // Formulario del pedido actual
  const [nuevoPedido, setNuevoPedido] = useState({
    destinatario: '',
    fechaEntrega: '',
    prioridad: 'Normal',
    estado: 'Pendiente', // Pendiente, En proceso, Completado, Cancelado
    articulos: [{ descripcion: '', cantidad: 1, unidad: 'Unidades', detalles: '' }],
    observaciones: '',
    totalEstimado: ''
  });

  const [filtroEstado, setFiltroEstado] = useState('Todos');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. Cargar las Opciones de Proveedores (para autocompletado/slider)
      const provSnapshot = await getDocs(collection(db, 'por_pagar'));
      const provData = [];
      provSnapshot.forEach((doc) => {
        provData.push({ id: doc.id, nombre: doc.data().nombre });
      });
      setProveedores(provData);

      // 2. Cargar los pedidos existentes
      const pedidosSnapshot = await getDocs(collection(db, 'pedidos'));
      const pedidosData = [];
      pedidosSnapshot.forEach((doc) => {
        pedidosData.push({ id: doc.id, ...doc.data() });
      });

      // Ordenar por fecha de creación o de entrega
      pedidosData.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
      setPedidos(pedidosData);

    } catch (error) {
      console.error('Error cargando datos:', error);
    }
    setLoading(false);
  };

  // Manejadores del Formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoPedido((prev) => ({ ...prev, [name]: value }));
  };

  const handleArticuloChange = (index, campo, valor) => {
    const nuevosArticulos = [...nuevoPedido.articulos];
    nuevosArticulos[index][campo] = valor;
    setNuevoPedido((prev) => ({ ...prev, articulos: nuevosArticulos }));
  };

  const agregarArticulo = () => {
    setNuevoPedido((prev) => ({
      ...prev,
      articulos: [...prev.articulos, { descripcion: '', cantidad: 1, unidad: 'Unidades', detalles: '' }]
    }));
  };

  const eliminarArticulo = (index) => {
    const nuevosArticulos = nuevoPedido.articulos.filter((_, i) => i !== index);
    setNuevoPedido((prev) => ({ ...prev, articulos: nuevosArticulos }));
  };

  const abrirModalNuevo = () => {
    setModoEdicion(false);
    setPedidoIdEditar(null);
    setNuevoPedido({
      destinatario: '',
      fechaEntrega: '',
      prioridad: 'Normal',
      estado: 'Pendiente',
      articulos: [{ descripcion: '', cantidad: 1, unidad: 'Unidades', detalles: '' }],
      observaciones: '',
      totalEstimado: ''
    });
    setMostrarModal(true);
  };

  const abrirModalEdicion = (pedido) => {
    setModoEdicion(true);
    setPedidoIdEditar(pedido.id);
    setNuevoPedido({ ...pedido });
    setMostrarModal(true);
  };

  const guardarPedido = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!nuevoPedido.destinatario.trim()) return alert('Debe ingresar un destinatario/proveedor.');
    if (!nuevoPedido.fechaEntrega) return alert('Debe indicar la fecha estimada de entrega.');
    const hayArticulosVacios = nuevoPedido.articulos.some(art => !art.descripcion.trim());
    if (hayArticulosVacios || nuevoPedido.articulos.length === 0) {
      return alert('Debe agregar al menos un artículo y no dejar descripciones vacías.');
    }

    try {
      if (modoEdicion) {
        // Actualizar existente
        const docRef = doc(db, 'pedidos', pedidoIdEditar);
        await updateDoc(docRef, nuevoPedido);
      } else {
        // Crear nuevo
        const pedidoToSave = {
          ...nuevoPedido,
          fechaCreacion: new Date().toISOString()
        };
        await addDoc(collection(db, 'pedidos'), pedidoToSave);
      }
      
      setMostrarModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error guardando pedido:', error);
      alert('Ocurrió un error al guardar el pedido.');
    }
  };

  const eliminarPedido = async (id) => {
    if (window.confirm('¿Desea eliminar este pedido permanentemente?')) {
      try {
        await deleteDoc(doc(db, 'pedidos', id));
        cargarDatos();
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const docRef = doc(db, 'pedidos', id);
      await updateDoc(docRef, { estado: nuevoEstado });
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  };

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '-';
    const fecha = new Date(fechaIso);
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const pedidosFiltrados = pedidos.filter(p => 
    filtroEstado === 'Todos' ? true : p.estado === filtroEstado
  );

  return (
    <div className="pedidos-page">
      <br />
      <div className="page-header">
        <h1>Gestión de Pedidos</h1>
        <p>Control de solicitudes y compras con todos los detalles</p>
      </div>

      <div className="pedidos-controles">
        <div className="filtros">
          <span className="icon">📋</span>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="filtro-select">
            <option value="Todos">Todos los Estados</option>
            <option value="Pendiente">Pendientes</option>
            <option value="En proceso">En Proceso</option>
            <option value="Completado">Completados</option>
            <option value="Cancelado">Cancelados</option>
          </select>
        </div>

        <button className="btn btn-primary btn-nuevo-pedido" onClick={abrirModalNuevo}>
          <i className="fas fa-plus"></i> Crear Nuevo Pedido
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Cargando pedidos...</div>
      ) : (
        <div className="grid-pedidos">
          {pedidosFiltrados.length === 0 ? (
            <div className="sin-resultados-card">
              No hay pedidos que coincidan con los filtros.
            </div>
          ) : (
            pedidosFiltrados.map((pedido) => (
              <div key={pedido.id} className={`pedido-card estado-${pedido.estado.toLowerCase().replace(' ', '-')}`}>
                <div className="card-header">
                  <div className="header-info">
                    <h3>{pedido.destinatario}</h3>
                    <span className={`badge-prioridad prioridad-${pedido.prioridad.toLowerCase()}`}>
                      {pedido.prioridad}
                    </span>
                  </div>
                  <div className="header-estado">
                    <select 
                      value={pedido.estado} 
                      onChange={(e) => cambiarEstado(pedido.id, e.target.value)}
                      className={`select-estado estado-${pedido.estado.toLowerCase().replace(' ', '-')}`}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En proceso">En proceso</option>
                      <option value="Completado">Completado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="card-body">
                  <p className="fecha-info"><strong>Entrega Estimada:</strong> {formatearFecha(pedido.fechaEntrega)}</p>
                  
                  <div className="articulos-resumen">
                     <h4>Artículos Solicitados ({pedido.articulos.length}):</h4>
                     <ul>
                       {pedido.articulos.slice(0, 3).map((art, idx) => (
                         <li key={idx}>
                           <span className="cant-badge">{art.cantidad} {art.unidad}</span> {art.descripcion}
                           {art.detalles && <span className="detalle-inline"> - {art.detalles}</span>}
                         </li>
                       ))}
                       {pedido.articulos.length > 3 && (
                         <li className="mas-articulos">...y {pedido.articulos.length - 3} más</li>
                       )}
                     </ul>
                  </div>

                  {pedido.observaciones && (
                    <div className="observaciones-box">
                      <strong>Notas:</strong> {pedido.observaciones}
                    </div>
                  )}

                  {pedido.totalEstimado && (
                    <div className="total-box">
                      <strong>Estimado:</strong> ${pedido.totalEstimado}
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <span className="fecha-creacion">Creado: {formatearFecha(pedido.fechaCreacion)}</span>
                  <div className="acciones-card">
                    <button className="btn-icon btn-edit" onClick={() => abrirModalEdicion(pedido)} title="Editar">
                      ✎
                    </button>
                    <button className="btn-icon btn-delete" onClick={() => eliminarPedido(pedido.id)} title="Eliminar">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL DE PEDIDO */}
      {mostrarModal && (
        <div className="modal-pedidos-overlay">
          <div className="modal-pedidos-content">
            <div className="modal-header">
              <h2>{modoEdicion ? 'Editar Pedido' : 'Crear Nuevo Pedido'}</h2>
              <button className="btn-close" onClick={() => setMostrarModal(false)}>✕</button>
            </div>
            
            <form onSubmit={guardarPedido} className="form-pedidos">
              <div className="form-row two-cols">
                <div className="form-group">
                  <label>A quién se le realiza el pedido (Proveedor / Persona):</label>
                  <input 
                    type="text" 
                    name="destinatario"
                    list="proveedores-list"
                    value={nuevoPedido.destinatario} 
                    onChange={handleInputChange} 
                    placeholder="Escriba o seleccione un proveedor"
                    required
                  />
                  <datalist id="proveedores-list">
                    {proveedores.map(prov => (
                      <option key={prov.id} value={prov.nombre} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label>Fecha Estimada de Entrega:</label>
                  <input 
                    type="date" 
                    name="fechaEntrega"
                    value={nuevoPedido.fechaEntrega} 
                    onChange={handleInputChange} 
                    required
                  />
                </div>
              </div>

              <div className="form-row two-cols">
                <div className="form-group">
                  <label>Prioridad:</label>
                  <select name="prioridad" value={nuevoPedido.prioridad} onChange={handleInputChange}>
                    <option value="Baja">Baja</option>
                    <option value="Normal">Normal</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Estado del Pedido:</label>
                  <select name="estado" value={nuevoPedido.estado} onChange={handleInputChange}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <hr className="form-divider" />
              <h3>Características del Pedido (Artículos)</h3>
              
              <div className="articulos-container">
                {nuevoPedido.articulos.map((articulo, index) => (
                  <div key={index} className="articulo-row">
                    <div className="art-col art-desc">
                      <label>Descripción del Artículo o Servicio</label>
                      <input 
                        type="text" 
                        value={articulo.descripcion}
                        onChange={(e) => handleArticuloChange(index, 'descripcion', e.target.value)}
                        placeholder="Ej. Tela Azul Marina 100% Algodón"
                        required
                      />
                    </div>
                    <div className="art-col art-cant">
                      <label>Cant.</label>
                      <input 
                        type="number" 
                        min="0.1"
                        step="0.1"
                        value={articulo.cantidad}
                        onChange={(e) => handleArticuloChange(index, 'cantidad', e.target.value)}
                        required
                      />
                    </div>
                    <div className="art-col art-unidad">
                      <label>Unidad</label>
                      <select 
                        value={articulo.unidad}
                        onChange={(e) => handleArticuloChange(index, 'unidad', e.target.value)}
                      >
                        <option value="Unidades">Unidades</option>
                        <option value="Kg">Kg</option>
                        <option value="Litros">Litros</option>
                        <option value="Metros">Metros</option>
                        <option value="Rollos">Rollos</option>
                        <option value="Cajas">Cajas</option>
                        <option value="Servicio">Servicio</option>
                      </select>
                    </div>
                    <div className="art-col art-detalles">
                      <label>Carácteristicas Específicas / Color / Talla</label>
                      <input 
                        type="text" 
                        value={articulo.detalles}
                        onChange={(e) => handleArticuloChange(index, 'detalles', e.target.value)}
                        placeholder="Info adicional del item..."
                      />
                    </div>
                    <div className="art-col art-acciones">
                      {nuevoPedido.articulos.length > 1 && (
                        <button type="button" className="btn-icon-red" onClick={() => eliminarArticulo(index)}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <button type="button" className="btn-add-articulo" onClick={agregarArticulo}>
                + Añadir otro artículo
              </button>

              <hr className="form-divider" />

              <div className="form-row two-cols style-bottom">
                <div className="form-group observacion-group">
                  <label>Observaciones Adicionales / Notas Generales:</label>
                  <textarea 
                    name="observaciones"
                    value={nuevoPedido.observaciones}
                    onChange={handleInputChange}
                    placeholder="Instrucciones de envío, consideraciones..."
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="form-group estimado-group">
                  <label>Total Estimado / Presupuesto ($) (Opcional):</label>
                  <input 
                    type="number" 
                    name="totalEstimado"
                    step="0.01"
                    min="0"
                    value={nuevoPedido.totalEstimado}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                  <div className="modal-actions">
                    <button type="button" className="btn-cancelar pointer-btn" onClick={() => setMostrarModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary pointer-btn">
                      {modoEdicion ? 'Guardar Cambios' : 'Confirmar Pedido'}
                    </button>
                  </div>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pedidos;
