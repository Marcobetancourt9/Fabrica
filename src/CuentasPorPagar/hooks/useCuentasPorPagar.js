import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../credentials';
import { registrarHistorial } from '../../utils/historial';
import { ordenarSemanas, generarSemanas2025, notificarGuardado, obtenerTotalesSemana } from '../utils';

export const useCuentasPorPagar = (userEmail) => {
  const [proveedores, setProveedores] = useState([]);
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: '', deudas: [] });
  const [filtro, setFiltro] = useState('');
  const [semanaFiltro, setSemanaFiltro] = useState('');
  const [mesFiltro, setMesFiltro] = useState(String(new Date().getMonth() + 1));
  const [anioFiltro, setAnioFiltro] = useState('2026');
  const [diaFiltro, setDiaFiltro] = useState('');
  const [semanas, setSemanas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaSemana, setNuevaSemana] = useState({ inicio: '', fin: '' });
  const [editandoDeuda, setEditandoDeuda] = useState(null);
  const [valorEditado, setValorEditado] = useState('');
  const [editandoPago, setEditandoPago] = useState(null);
  const [valorPagoEditado, setValorPagoEditado] = useState('');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
  const [semanaAbierta, setSemanaAbierta] = useState(null);
  const [mostrarDropdownSemanas, setMostrarDropdownSemanas] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const puedeEliminar = userEmail === 'marco.betancourt@correo.unimet.edu.ve';
  const puedeEditar = puedeEliminar || userEmail === 'reinaldo.pinchopan@gmail.com' || userEmail === 'cxp.pinchopan@gmail.com' || userEmail === 'marcobetancourt2006@gmail.com';

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'por_pagar'));
        const proveedoresData = [];
        querySnapshot.forEach((docSnap) => {
          proveedoresData.push({ id: docSnap.id, ...docSnap.data() });
        });
        setProveedores(proveedoresData);

        const configRef = doc(db, 'configuracion', 'semanas_por_pagar');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          setSemanas(ordenarSemanas(configSnap.data().lista || []));
        } else {
          const semanasIniciales = ordenarSemanas(generarSemanas2025());
          await setDoc(configRef, { lista: semanasIniciales, inicializado: true });
          setSemanas(semanasIniciales);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };
    cargarTodo();
  }, []);

  const agregarProveedor = async () => {
    if (!nuevoProveedor.nombre.trim()) {
      alert('Por favor ingrese un nombre para el proveedor');
      return;
    }

    try {
      const deudasInicializadas = semanas.map(semana => ({
        semana: semana.key, monto: '', pagado: 0, pagadoCompleto: false
      }));

      const proveedorConDeudas = {
        nombre: nuevoProveedor.nombre,
        deudas: deudasInicializadas,
        rif: '', encargado: '', registroDiario: {}
      };

      const docRef = doc(collection(db, 'por_pagar'));
      setProveedores([...proveedores, { id: docRef.id, ...proveedorConDeudas, esNuevoLocal: true }]);
      setNuevoProveedor({ nombre: '', deudas: [] });
      notificarGuardado('✅ Proveedor creado exitosamente.');

      setDoc(docRef, proveedorConDeudas)
        .then(() => registrarHistorial('CREACIÓN', 'Cuentas por Pagar', docRef.id, { nombre: nuevoProveedor.nombre }))
        .catch(error => console.error('Error sincronizando proveedor:', error));
    } catch (error) {
      console.error('Error local agregando proveedor:', error);
    }
  };

  const abrirDetalleProveedor = (proveedor, semanaKey = null) => {
    setProveedorSeleccionado(proveedor);
    setSemanaAbierta(semanaKey);
    setMostrarModalDetalle(true);
  };

  const guardarDetalleProveedor = async (nuevosDatos) => {
    try {
      const pRef = doc(db, 'por_pagar', proveedorSeleccionado.id);
      const payload = {
        rif: nuevosDatos.rif,
        encargado: nuevosDatos.encargado,
        registroDiario: nuevosDatos.registroDiario
      };

      setProveedores(proveedores.map(p =>
        p.id === proveedorSeleccionado.id ? { ...p, ...payload } : p
      ));
      setMostrarModalDetalle(false);
      setProveedorSeleccionado(null);
      notificarGuardado('✅ Cambios guardados exitosamente en la base de datos.');

      updateDoc(pRef, payload)
        .then(() => registrarHistorial('EDICIÓN', 'Cuentas por Pagar', proveedorSeleccionado.id, { accion: 'Detalle/Ficha guardada' }))
        .catch(err => console.error('Error sincronizando detalle:', err));
    } catch (error) {
      console.error('Error local al guardar detalle:', error);
    }
  };

  const eliminarProveedor = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este proveedor?')) {
      try {
        const proveedor = proveedores.find(p => p.id === id);
        setProveedores(proveedores.filter(p => p.id !== id));
        notificarGuardado('✅ Proveedor eliminado exitosamente.');

        deleteDoc(doc(db, 'por_pagar', id))
          .then(() => registrarHistorial('ELIMINACIÓN', 'Cuentas por Pagar', id, { nombre: proveedor?.nombre }))
          .catch(error => console.error('Error sincronizando eliminación de proveedor:', error));
      } catch (error) {
        console.error('Error local eliminando proveedor:', error);
      }
    }
  };

  const eliminarSemana = async (semanaKey) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta semana permanentemente? Se borrará de la base de datos.')) {
      const nuevasSemanas = semanas.filter(s => s.key !== semanaKey);
      setSemanas(nuevasSemanas);
      const proveedoresActualizados = proveedores.map(proveedor => ({
        ...proveedor, deudas: proveedor.deudas.filter(d => d.semana !== semanaKey)
      }));
      setProveedores(proveedoresActualizados);

      try {
        notificarGuardado('✅ Semana eliminada exitosamente.');
        updateDoc(doc(db, 'configuracion', 'semanas_por_pagar'), { lista: nuevasSemanas }).catch(e => console.error(e));
        proveedoresActualizados.forEach((proveedor) => {
          updateDoc(doc(db, 'por_pagar', proveedor.id), { deudas: proveedor.deudas }).catch(e => console.error(e));
        });
        registrarHistorial('ELIMINACIÓN', 'Cuentas por Pagar', 'GLOBAL', { accion: `Semana ${semanaKey} eliminada` }).catch(e => console.error(e));
      } catch (error) {
        console.error('Error local eliminando semana:', error);
      }
    }
  };

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

      await updateDoc(doc(db, 'por_pagar', proveedorId), { deudas: deudasActualizadas });
      setProveedores(proveedores.map(p =>
        p.id === proveedorId ? { ...p, deudas: deudasActualizadas } : p
      ));
      await registrarHistorial('EDICIÓN', 'Cuentas por Pagar', proveedorId, { semana: semanaKey, pagoCompleto: pagadoCompleto });
    } catch (error) {
      console.error('Error actualizando pago completo:', error);
    }
  };

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

      setProveedores(proveedores.map(p =>
        p.id === proveedorId ? { ...p, deudas: deudasActualizadas } : p
      ));

      setEditandoDeuda(null);
      notificarGuardado();

      updateDoc(doc(db, 'por_pagar', proveedorId), { deudas: deudasActualizadas })
      .then(() => registrarHistorial('EDICIÓN', 'Cuentas por Pagar', proveedorId, { semana: semanaKey, nuevaDeuda: montoNumerico }))
      .catch(e => console.error('Error sincronizando deuda:', e));
    } catch (error) {
      console.error('Error actualizando deuda:', error);
    }
  };

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

      setProveedores(proveedores.map(p =>
        p.id === proveedorId ? { ...p, deudas: deudasActualizadas } : p
      ));

      setEditandoPago(null);
      notificarGuardado();

      updateDoc(doc(db, 'por_pagar', proveedorId), { deudas: deudasActualizadas })
      .then(() => registrarHistorial('EDICIÓN', 'Cuentas por Pagar', proveedorId, { semana: semanaKey, nuevoPago: pagoNumerico }))
      .catch(e => console.error('Error sincronizando pago:', e));
    } catch (error) {
      console.error('Error actualizando pago:', error);
    }
  };

  const agregarSemana = async () => {
    if (!nuevaSemana.inicio || !nuevaSemana.fin) {
      alert('Por favor ingrese ambas fechas');
      return;
    }

    const formatearFecha = (fechaInput) => {
      if (fechaInput.includes('-')) {
        const [y, m, d] = fechaInput.split('-');
        return `${d}/${m}/${y}`;
      }
      return fechaInput;
    };

    const inicioFormateado = formatearFecha(nuevaSemana.inicio);
    const finFormateado = formatearFecha(nuevaSemana.fin);

    const regexFecha = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regexFecha.test(inicioFormateado) || !regexFecha.test(finFormateado)) {
      alert('Formato de fecha inválido. Use el selector de calendario');
      return;
    }

    const nuevaSemanaKey = `${inicioFormateado}-${finFormateado}`;

    if (semanas.some(s => s.key === nuevaSemanaKey)) {
      alert('Esta semana ya existe');
      return;
    }

    const semana = { inicio: inicioFormateado, fin: finFormateado, key: nuevaSemanaKey, creadaManualmente: true };
    const nuevaListaSemanas = ordenarSemanas([...semanas, semana]);

    setSemanas(nuevaListaSemanas);
    const proveedoresActualizados = proveedores.map(proveedor => ({
      ...proveedor,
      deudas: [...proveedor.deudas, { semana: semana.key, monto: '', pagado: 0, pagadoCompleto: false }]
    }));
    setProveedores(proveedoresActualizados);

    try {
      await updateDoc(doc(db, 'configuracion', 'semanas_por_pagar'), { lista: nuevaListaSemanas });
      proveedoresActualizados.forEach(async (proveedor) => {
        await updateDoc(doc(db, 'por_pagar', proveedor.id), { deudas: proveedor.deudas });
      });
      await registrarHistorial('CREACIÓN', 'Cuentas por Pagar', 'GLOBAL', { accion: `Semana ${nuevaSemanaKey} agregada` });
      notificarGuardado('✅ Semana agregada exitosamente.');
    } catch (error) {
      console.error('Error sincronizando adición de semana:', error);
    }
    setNuevaSemana({ inicio: '', fin: '' });
    setMostrarModal(false);
  };

  const proveedoresFiltrados = useMemo(() => {
    // Semanas pertenecientes al año seleccionado (calculadas inline para no crear dependencia circular)
    // Si anioFiltro está vacío, incluir todas las semanas (todos los años)
    const semanasPorAnio = !anioFiltro ? semanas : semanas.filter(s => {
      const a1 = parseInt(s.inicio.split('/')[2]);
      const a2 = parseInt(s.fin.split('/')[2]);
      return a1 === parseInt(anioFiltro) || a2 === parseInt(anioFiltro);
    });

    return proveedores.filter(proveedor => {
      const coincideNombre = proveedor.nombre.toLowerCase().includes(filtro.toLowerCase());
      if (!coincideNombre) return false;

      // Proveedores recién creados en sesión: siempre visibles
      if (proveedor.esNuevoLocal) return true;

      // Debe tener actividad real en el año seleccionado (si hay filtro de año)
      if (anioFiltro) {
        const tieneActividadEnAnio = semanasPorAnio.some(s => {
          const totales = obtenerTotalesSemana(proveedor, s.key);
          return totales.monto !== 0 || totales.pagado !== 0;
        });
        if (!tieneActividadEnAnio) return false;
      }

      // Filtro por semana específica
      if (semanaFiltro) {
        const tieneDeudaEnSemana = proveedor.deudas?.some(deuda => deuda.semana === semanaFiltro) || !!proveedor.registroDiario?.[semanaFiltro];
        if (!tieneDeudaEnSemana) return false;
      }

      // Filtro por mes: debe tener actividad en alguna semana de ese mes dentro del año
      if (mesFiltro) {
        const tieneActividadEnMes = semanasPorAnio.some(s => {
          const [, m] = s.inicio.split('/').map(Number);
          if (m !== parseInt(mesFiltro)) return false;
          const totales = obtenerTotalesSemana(proveedor, s.key);
          return totales.monto !== 0 || totales.pagado !== 0;
        });
        if (!tieneActividadEnMes) return false;
      }

      // Filtro por día
      if (diaFiltro) {
        let tieneRegistroEseDia = false;
        if (proveedor.registroDiario) {
          Object.values(proveedor.registroDiario).forEach(diaRecords => {
            if (diaRecords[diaFiltro]) {
              const diaData = diaRecords[diaFiltro];
              const registrosDia = Array.isArray(diaData) ? diaData : [diaData];
              registrosDia.forEach(d => {
                if ((parseFloat(d.monto) || 0) !== 0 || (parseFloat(d.pagado) || 0) !== 0) {
                  tieneRegistroEseDia = true;
                }
              });
            }
          });
        }
        if (!tieneRegistroEseDia) return false;
      }

      return true;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [proveedores, filtro, semanaFiltro, mesFiltro, diaFiltro, semanas, anioFiltro]);

  const semanasFiltradasPorAnio = useMemo(() => {
    // Si no hay año seleccionado, devolver todas las semanas
    if (!anioFiltro) return semanas;
    return semanas.filter(semana => {
      const a1 = parseInt(semana.inicio.split('/')[2]);
      const a2 = parseInt(semana.fin.split('/')[2]);
      return a1 === parseInt(anioFiltro) || a2 === parseInt(anioFiltro);
    });
  }, [semanas, anioFiltro]);

  const semanasAMostrar = useMemo(() => {
    return semanasFiltradasPorAnio.filter(semana => {
      if (semanaFiltro && semana.key !== semanaFiltro) return false;
      if (mesFiltro) {
        const [d, m, a] = semana.inicio.split('/').map(Number);
        if (m !== parseInt(mesFiltro)) return false;
      }
      if (diaFiltro) {
        const f = new Date(diaFiltro + 'T00:00:00');
        const [d1, m1, a1] = semana.inicio.split('/').map(Number);
        const [d2, m2, a2] = semana.fin.split('/').map(Number);
        const fInicio = new Date(a1, m1 - 1, d1);
        const fFin = new Date(a2, m2 - 1, d2);
        fFin.setHours(23, 59, 59);
        if (f < fInicio || f > fFin) return false;
      }
      return true;
    });
  }, [semanasFiltradasPorAnio, semanaFiltro, mesFiltro, diaFiltro]);

  const totalesGlobales = useMemo(() => {
    let totalDeuda = 0;
    let totalPagado = 0;

    // Si no hay filtros activos de mes o día, usar obtenerTotalesSemana directamente (más rápido)
    const sinFiltroFecha = !mesFiltro && !diaFiltro;

    proveedoresFiltrados.forEach(proveedor => {
      semanasAMostrar.forEach(semana => {
        if (sinFiltroFecha) {
          const totales = obtenerTotalesSemana(proveedor, semana.key);
          totalDeuda += totales.monto;
          totalPagado += totales.pagado;
          return;
        }

        // Con filtro de mes o día: sumar solo los registros cuya fecha real pertenece al filtro
        const registroSemana = proveedor.registroDiario?.[semana.key] || {};
        let montoSemana = 0;
        let pagadoSemana = 0;
        let tieneRegistrosDiarios = false;

        Object.entries(registroSemana).forEach(([diaKey, diaData]) => {
          // La clave del día puede ser YYYY-MM-DD
          const fechaRegistro = diaKey; // formato YYYY-MM-DD

          // Filtrar por mes
          if (mesFiltro) {
            const mesRegistro = parseInt(fechaRegistro.split('-')[1]);
            if (mesRegistro !== parseInt(mesFiltro)) return;
          }

          // Filtrar por día exacto
          if (diaFiltro && fechaRegistro !== diaFiltro) return;

          tieneRegistrosDiarios = true;
          const registrosDia = Array.isArray(diaData) ? diaData : [diaData];
          registrosDia.forEach(d => {
            const base = parseFloat(d.monto) || 0;
            const sign = base < 0 ? -1 : 1;
            const absBase = Math.abs(base);
            let absIva16 = 0, absIva8 = 0;
            if (d.tasaIva === 'Manual') {
              absIva16 = Math.abs(parseFloat(d.ivaManual) || 0);
            } else {
              absIva16 = Math.abs(parseFloat(d.iva16) || 0);
              absIva8 = Math.abs(parseFloat(d.iva8) || 0);
            }
            const absRetencion = Math.abs(parseFloat(d.retencion) || 0);
            const absRetencionIva = Math.abs(parseFloat(d.retencionIva) || 0);
            const totalDocumentoNeto = (absBase + absIva16 + absIva8) - absRetencion - absRetencionIva;

            if (d.tipoDocumento === 'Pago') {
              pagadoSemana += totalDocumentoNeto;
            } else {
              montoSemana += totalDocumentoNeto * sign;
              pagadoSemana += parseFloat(d.pagado) || 0;
            }
          });
        });

        // Fallback al sistema antiguo (deudas[]) solo si no hay registroDiario en absoluto
        if (!tieneRegistrosDiarios && !Object.keys(registroSemana).length) {
          const deudaAntigua = proveedor.deudas?.find(d => d.semana === semana.key);
          if (deudaAntigua) {
            montoSemana = parseFloat(deudaAntigua.monto) || 0;
            pagadoSemana = parseFloat(deudaAntigua.pagado) || 0;
          }
        }

        totalDeuda += montoSemana;
        totalPagado += pagadoSemana;
      });
    });

    return { totalDeuda, totalPagado, saldoFaltante: Math.max(0, totalDeuda - totalPagado) };
  }, [proveedoresFiltrados, semanasAMostrar, mesFiltro, diaFiltro]);

  return {
    // States
    proveedores, nuevoProveedor, setNuevoProveedor,
    filtro, setFiltro, semanaFiltro, setSemanaFiltro,
    mesFiltro, setMesFiltro, anioFiltro, setAnioFiltro, diaFiltro, setDiaFiltro,
    semanas, setSemanas, mostrarModal, setMostrarModal,
    nuevaSemana, setNuevaSemana, editandoDeuda, setEditandoDeuda,
    valorEditado, setValorEditado, editandoPago, setEditandoPago,
    valorPagoEditado, setValorPagoEditado, proveedorSeleccionado,
    setProveedorSeleccionado, mostrarModalDetalle, setMostrarModalDetalle,
    semanaAbierta, setSemanaAbierta, mostrarDropdownSemanas, setMostrarDropdownSemanas,
    mostrarHistorial, setMostrarHistorial,

    // Computed / Helpers
    puedeEliminar, puedeEditar, proveedoresFiltrados, semanasAMostrar, totalesGlobales, semanasFiltradasPorAnio,

    // Actions
    agregarProveedor, abrirDetalleProveedor, guardarDetalleProveedor,
    eliminarProveedor, eliminarSemana, actualizarPagoCompleto,
    actualizarDeuda, actualizarPago, agregarSemana
  };
};
