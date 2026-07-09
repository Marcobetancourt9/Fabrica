import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../credentials';
import { InstallAppButton } from '../PWA/InstallAppButton';
import FichaProveedor from './FichaProveedor';
import './CuentasPorPagar.css';

const CuentasPorPagar = () => {
  const [proveedores, setProveedores] = useState([]);
  const [nuevoProveedor, setNuevoProveedor] = useState({ 
    nombre: '', 
    deudas: [] 
  });
  const [filtro, setFiltro] = useState('');
  const [semanaFiltro, setSemanaFiltro] = useState('');
  const [mesFiltro, setMesFiltro] = useState('');
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

  // Generar todas las semanas del año actual (Lunes a Domingo)
  const generarSemanasAnioActual = () => {
    const anio = new Date().getFullYear();
    const semanasAnio = [];
    // Encontrar el primer lunes del año
    let fecha = new Date(anio, 0, 1);
    while (fecha.getDay() !== 1) {
      fecha.setDate(fecha.getDate() + 1);
    }
    let numSemana = 1;
    while (fecha.getFullYear() <= anio && numSemana <= 53) {
      const inicio = new Date(fecha);
      const fin = new Date(fecha);
      fin.setDate(fin.getDate() + 6);
      const formatoFecha = (f) => f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const inicioStr = formatoFecha(inicio);
      const finStr = formatoFecha(fin);
      const key = `${inicioStr}-${finStr}`;
      // Solo agregar si no existe ya en las semanas cargadas
      const yaExiste = semanas.some(s => s.key === key);
      semanasAnio.push({
        inicio: inicioStr,
        fin: finStr,
        key,
        numSemana,
        yaExiste
      });
      fecha.setDate(fecha.getDate() + 7);
      numSemana++;
    }
    return semanasAnio;
  };

  // Generar semanas para 2025
  function generarSemanas2025() {
    const semanas = [];
    let fechaInicio = new Date(2025, 0, 1);
    const fechaFin = new Date(2025, 11, 31);
    
    while (fechaInicio <= fechaFin) {
      const inicioSemana = new Date(fechaInicio);
      const finSemana = new Date(fechaInicio);
      finSemana.setDate(finSemana.getDate() + 6);
      
      const formatoFecha = (fecha) => {
        return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  // Cargar datos desde Firebase
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
          setSemanas(configSnap.data().lista || []);
        } else {
          const semanasIniciales = generarSemanas2025();
          await setDoc(configRef, { lista: semanasIniciales, inicializado: true });
          setSemanas(semanasIniciales);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };
    cargarTodo();
  }, []);

  // Calcular deuda total por semana sumando días
  const obtenerTotalesSemana = (proveedor, semanaKey) => {
    const registroSemana = proveedor.registroDiario?.[semanaKey] || {};
    let montoTotal = 0;
    let pagadoTotal = 0;
    
    // Sumar montos de los días incluyendo impuestos y retenciones
    Object.values(registroSemana).forEach(dia => {
      const registrosDia = Array.isArray(dia) ? dia : [dia];
      
      registrosDia.forEach(d => {
        // En los registros, la retención se almacena en positivo o negativo dependiendo del tipo de doc,
        // pero la regla general es: Monto + IVA - RetMunicipal - RetIVA
        // Para simplificar, usaremos los valores absolutos y el signo del monto base.
        const base = parseFloat(d.monto) || 0;
        const sign = base < 0 ? -1 : 1;
        const absBase = Math.abs(base);
        const absIva16 = Math.abs(parseFloat(d.iva16) || 0);
        const absIva8 = Math.abs(parseFloat(d.iva8) || 0);
        const absRetencion = Math.abs(parseFloat(d.retencion) || 0);
        const absRetencionIva = Math.abs(parseFloat(d.retencionIva) || 0);
        
        const totalDocumentoNeto = (absBase + absIva16 + absIva8) - absRetencion - absRetencionIva;
        
        montoTotal += (totalDocumentoNeto * sign);
        pagadoTotal += parseFloat(d.pagado) || 0;
      });
    });

    // Mantener compatibilidad con el sistema anterior si no hay registros diarios aún
    if (montoTotal === 0) {
      const deudaAntigua = proveedor.deudas?.find(d => d.semana === semanaKey);
      if (deudaAntigua) {
        montoTotal = parseFloat(deudaAntigua.monto) || 0;
        pagadoTotal = parseFloat(deudaAntigua.pagado) || 0;
      }
    }

    return { monto: montoTotal, pagado: pagadoTotal, saldo: Math.max(0, montoTotal - pagadoTotal) };
  };

  // Agregar nuevo proveedor
  const agregarProveedor = async () => {
    if (!nuevoProveedor.nombre.trim()) {
      alert('Por favor ingrese un nombre para el proveedor');
      return;
    }
    
    try {
      // Inicializar deudas para todas las semanas
      const deudasInicializadas = semanas.map(semana => ({
        semana: semana.key,
        monto: '',
        pagado: 0,
        pagadoCompleto: false
      }));
      
      const proveedorConDeudas = {
        nombre: nuevoProveedor.nombre,
        deudas: deudasInicializadas,
        rif: '',
        encargado: '',
        registroDiario: {}
      };
      
      const docRef = await addDoc(collection(db, 'por_pagar'), proveedorConDeudas);
      setProveedores([...proveedores, { id: docRef.id, ...proveedorConDeudas }]);
      setNuevoProveedor({ nombre: '', deudas: [] });
    } catch (error) {
      console.error('Error agregando proveedor:', error);
    }
  };

  // Abrir ficha full-screen
  const abrirDetalleProveedor = (proveedor, semanaKey = null) => {
    setProveedorSeleccionado(proveedor);
    setSemanaAbierta(semanaKey);
    setMostrarModalDetalle(true);
  };

  // Sincronizar Ficha con Firebase
  const guardarDetalleProveedor = async (nuevosDatos) => {
    try {
      const pRef = doc(db, 'por_pagar', proveedorSeleccionado.id);
      const payload = {
        rif: nuevosDatos.rif,
        encargado: nuevosDatos.encargado,
        registroDiario: nuevosDatos.registroDiario
      };

      await updateDoc(pRef, payload);

      setProveedores(proveedores.map(p => 
        p.id === proveedorSeleccionado.id ? { ...p, ...payload } : p
      ));

      setMostrarModalDetalle(false);
      setProveedorSeleccionado(null);
      alert('Cambios guardados exitosamente en la base de datos.');
    } catch (error) {
      console.error('Error al guardar en Firebase:', error);
      alert('Error al sincronizar con la base de datos.');
    }
  };

  // Descargar CSV por semana (Reporte Contable Detallado)
  const descargarCSV = (semanaKey) => {
    const semana = semanas.find(s => s.key === semanaKey);
    const diasSemana = [0, 1, 2, 3, 4, 5, 6].map(i => {
      const [d, m, a] = semana.inicio.split('/').map(Number);
      const f = new Date(a, m - 1, d);
      f.setDate(f.getDate() + i);
      return f.toISOString().split('T')[0];
    });

    const titular = "Inversiones pincho pan express II C.A.";
    const subTitular = `Reporte de Cuentas por Pagar - Semana: ${semana.inicio} al ${semana.fin}`;

    // Encabezados contables solicitados
    const headers = [
      'Proveedor', 'RIF', 'Encargado', 'Fecha', 'Tipo de Documento', 'Nro Factura',
      'Monto Base', 'IVA 16%', 'IVA 8%', 'Ret. Municipal', 'Total Bruto',
      'Pagado', 'Saldo', 'Referencia/Pago', 'Observaciones'
    ];

    const filasTransactions = [];

    proveedores.forEach(p => {
      const registroSemana = p.registroDiario?.[semanaKey] || {};
      
      diasSemana.forEach(dk => {
        const diaData = registroSemana[dk];
        if (diaData) {
          const registrosDia = Array.isArray(diaData) ? diaData : [diaData];
          
          registrosDia.forEach(d => {
            if (((parseFloat(d.monto) || 0) !== 0 || (parseFloat(d.pagado) || 0) !== 0)) {
              const base = parseFloat(d.monto) || 0;
              const sign = base < 0 ? -1 : 1;
              const absBase = Math.abs(base);
              const absIva16 = Math.abs(parseFloat(d.iva16) || 0);
              const absIva8 = Math.abs(parseFloat(d.iva8) || 0);
              const absRet = Math.abs(parseFloat(d.retencion) || 0);
              const absRetIva = Math.abs(parseFloat(d.retencionIva) || 0);
              const pagado = parseFloat(d.pagado) || 0;
              
              const totalNeto = ((absBase + absIva16 + absIva8) - absRet - absRetIva) * sign;
              const saldo = Math.max(0, totalNeto - pagado); // El saldo no puede ser negativo en el CSV
  
              const formatearNum = (num) => num.toFixed(2).replace('.', ',');
  
              filasTransactions.push([
                `"${p.nombre}"`,
                `"${p.rif || '-'}"`,
                `"${p.encargado || '-'}"`,
                `"${d.fechaOperacion || dk}"`,
                `"${d.tipoDocumento || 'Factura'}"`,
                `"${d.numeroFactura || '-'}"`,
                formatearNum(base),
                formatearNum(absIva16 * sign),
                formatearNum(absIva8 * sign),
                formatearNum(absRet * sign), // Mostrar las retenciones con su signo respectivo
                formatearNum(totalNeto),
                formatearNum(pagado),
                formatearNum(saldo),
                `"${d.referencia || '-'}"`,
                `"${(d.observaciones || '').replace(/\n/g, ' ')}"`
              ]);
            }
          });
        }
      });
    });

    // Construcción del contenido CSV con Titular
    const csvContent = [
      titular,
      subTitular,
      '', // Espacio en blanco
      headers.join(';'),
      ...filasTransactions.map(f => f.join(';'))
    ].join('\n');

    const universalBOM = "\uFEFF";
    const blob = new Blob([universalBOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_PinchoPan_${semanaKey.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Descargar CSV Resumen (Una fila por proveedor por semana)
  const descargarResumenCSV = (semanaKey) => {
    const semana = semanas.find(s => s.key === semanaKey);
    const titular = "Inversiones pincho pan express II C.A.";
    const subTitular = `Resumen General de Cuentas por Pagar - Semana: ${semana.inicio} al ${semana.fin}`;

    const headers = ['Proveedor', 'RIF', 'Encargado', 'Deuda Total', 'Total Pagado', 'Saldo Pendiente'];

    const filas = proveedores.map(p => {
      const totales = obtenerTotalesSemana(p, semanaKey);
      const formatearNum = (num) => num.toFixed(2).replace('.', ',');

      return [
        `"${p.nombre}"`,
        `"${p.rif || '-'}"`,
        `"${p.encargado || '-'}"`,
        formatearNum(totales.monto),
        formatearNum(totales.pagado),
        formatearNum(totales.saldo)
      ];
    });

    const csvContent = [
      titular,
      subTitular,
      '',
      headers.join(';'),
      ...filas.map(f => f.join(';'))
    ].join('\n');

    const universalBOM = "\uFEFF";
    const blob = new Blob([universalBOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Resumen_Cuentas_${semanaKey.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Descargar Reporte Anual (Consolidado de todas las semanas)
  const descargarReporteAnualCSV = () => {
    const titular = "Inversiones pincho pan express II C.A.";
    const subTitular = "Reporte Anual Consolidado - Periodo 2025";

    const headers = ['Proveedor', 'RIF', 'Encargado', 'Deuda Total Anual', 'Total Pagado Anual', 'Saldo Anual Pendiente'];

    const filas = proveedores.map(p => {
      let deudaAnual = 0;
      let pagadoAnual = 0;
      
      // Sumar todas las semanas registradas
      semanas.forEach(semana => {
        const totales = obtenerTotalesSemana(p, semana.key);
        deudaAnual += totales.monto;
        pagadoAnual += totales.pagado;
      });

      const formatearNum = (num) => num.toFixed(2).replace('.', ',');

      return [
        `"${p.nombre}"`,
        `"${p.rif || '-'}"`,
        `"${p.encargado || '-'}"`,
        formatearNum(deudaAnual),
        formatearNum(pagadoAnual),
        formatearNum(Math.max(0, deudaAnual - pagadoAnual))
      ];
    });

    const csvContent = [
      titular,
      subTitular,
      '',
      headers.join(';'),
      ...filas.map(f => f.join(';'))
    ].join('\n');

    const universalBOM = "\uFEFF";
    const blob = new Blob([universalBOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Reporte_Anual_Consolidado_2025.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Descargar Reporte Histórico por Proveedor (Todas sus semanas y transacciones)
  const descargarReporteProveedorCSV = (p) => {
    const titular = "Inversiones pincho pan express II C.A.";
    const subTitular = `Estado de Cuenta Histórico: ${p.nombre} (RIF: ${p.rif || '-'})`;

    const headers = [
      'Semana', 'Fecha', 'Tipo de Documento', 'Nro Factura',
      'Monto Base', 'IVA 16%', 'IVA 8%', 'Ret. Municipal', 'Total Bruto',
      'Pagado', 'Saldo', 'Referencia/Pago', 'Observaciones'
    ];

    const filasTransactions = [];

    semanas.forEach(semana => {
      const registroSemana = p.registroDiario?.[semana.key] || {};
      const [d, m, a] = semana.inicio.split('/').map(Number);
      
      [0, 1, 2, 3, 4, 5, 6].forEach(i => {
        const fechaBase = new Date(a, m - 1, d);
        fechaBase.setDate(fechaBase.getDate() + i);
        const dk = fechaBase.toISOString().split('T')[0];
        
        const diaData = registroSemana[dk];
        if (diaData) {
          const registrosDia = Array.isArray(diaData) ? diaData : [diaData];
          
          registrosDia.forEach(dData => {
            if (((parseFloat(dData.monto) || 0) !== 0 || (parseFloat(dData.pagado) || 0) !== 0)) {
              const base = parseFloat(dData.monto) || 0;
              const sign = base < 0 ? -1 : 1;
              const absBase = Math.abs(base);
              const absIva16 = Math.abs(parseFloat(dData.iva16) || 0);
              const absIva8 = Math.abs(parseFloat(dData.iva8) || 0);
              const absRet = Math.abs(parseFloat(dData.retencion) || 0);
              const absRetIva = Math.abs(parseFloat(dData.retencionIva) || 0);
              const pagado = parseFloat(dData.pagado) || 0;
              
              const totalNeto = ((absBase + absIva16 + absIva8) - absRet - absRetIva) * sign;
              const saldo = Math.max(0, totalNeto - pagado);
  
              const formatearNum = (num) => num.toFixed(2).replace('.', ',');
  
              filasTransactions.push([
                `"${semana.inicio} a ${semana.fin}"`,
                `"${dData.fechaOperacion || dk}"`,
                `"${dData.tipoDocumento || 'Factura'}"`,
                `"${dData.numeroFactura || '-'}"`,
                formatearNum(base),
                formatearNum(absIva16 * sign),
                formatearNum(absIva8 * sign),
                formatearNum(absRet * sign),
                formatearNum(totalNeto),
                formatearNum(pagado),
                formatearNum(saldo),
                `"${dData.referencia || '-'}"`,
                `"${(dData.observaciones || '').replace(/\n/g, ' ')}"`
              ]);
            }
          });
        }
      });
    });

    const csvContent = [
      titular,
      subTitular,
      '',
      headers.join(';'),
      ...filasTransactions.map(f => f.join(';'))
    ].join('\n');

    const universalBOM = "\uFEFF";
    const blob = new Blob([universalBOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Estado_Cuenta_${p.nombre.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    
    // Convertir de formato nativo date (YYYY-MM-DD) a DD/MM/YYYY
    const formatearFecha = (fechaInput) => {
      if (fechaInput.includes('-')) {
        const [y, m, d] = fechaInput.split('-');
        return `${d}/${m}/${y}`;
      }
      return fechaInput; // Por si viene ya con formato
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
    
    const semana = {
      inicio: inicioFormateado,
      fin: finFormateado,
      key: nuevaSemanaKey,
      creadaManualmente: true
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
    
    // Filtro por semana específica
    if (semanaFiltro) {
      const tieneDeudaEnSemana = proveedor.deudas?.some(deuda => deuda.semana === semanaFiltro) || 
                                !!proveedor.registroDiario?.[semanaFiltro];
      if (!tieneDeudaEnSemana) return false;
    }

    // Filtro por mes (revisar todas las semanas del mes)
    if (mesFiltro) {
      const tieneActividadEnMes = semanas.some(s => {
        const [d, m, a] = s.inicio.split('/').map(Number);
        if (m === parseInt(mesFiltro)) {
          const totales = obtenerTotalesSemana(proveedor, s.key);
          return totales.monto > 0 || totales.pagado > 0;
        }
        return false;
      });
      if (!tieneActividadEnMes) return false;
    }

    // Filtro por día específico (revisar en registroDiario)
    if (diaFiltro) {
      // diaFiltro viene en formato YYYY-MM-DD
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
    
    return coincideNombre;
  });

  // Filtrar las SEMANAS (columnas) que se muestran en la tabla
  const semanasAMostrar = semanas.filter(semana => {
    // Si hay filtro de semana específica
    if (semanaFiltro && semana.key !== semanaFiltro) return false;

    // Si hay filtro de mes
    if (mesFiltro) {
      const [d, m, a] = semana.inicio.split('/').map(Number);
      if (m !== parseInt(mesFiltro)) return false;
    }

    // Si hay filtro de día específico
    if (diaFiltro) {
      // diaFiltro es YYYY-MM-DD. Comprobamos si el día cae dentro de esta semana
      const [d, m, a] = semana.inicio.split('/').map(Number);
      const fInicio = new Date(a, m - 1, d);
      const fFin = new Date(fInicio);
      fFin.setDate(fFin.getDate() + 6);
      
      const fDia = new Date(diaFiltro + 'T00:00:00'); // Evitar problemas de zona horaria
      if (fDia < fInicio || fDia > fFin) return false;
    }

    // Ocultar semanas que no tienen datos (monto o pagado) en ningún proveedor
    if (!semanaFiltro) {
      const tieneActividad = proveedores.some(p => {
        const totales = obtenerTotalesSemana(p, semana.key);
        return totales.monto !== 0 || totales.pagado !== 0;
      });
      if (!tieneActividad && !semana.creadaManualmente) return false;
    }

    return true;
  });

  const limpiarFiltros = () => {
    setFiltro('');
    setSemanaFiltro('');
    setMesFiltro('');
    setDiaFiltro('');
  };

  // Calcular saldo pendiente por semana
  const calcularSaldoPendiente = (deuda) => {
    const monto = parseFloat(deuda.monto) || 0;
    const pagado = parseFloat(deuda.pagado) || 0;
    return Math.max(0, monto - pagado);
  };

  // Calcular total general por proveedor (sumando todas las semanas)
  const calcularTotalProveedor = (proveedor) => {
    return semanas.reduce((total, semana) => {
      return total + obtenerTotalesSemana(proveedor, semana.key).monto;
    }, 0);
  };

  // Calcular total pagado por proveedor
  const calcularTotalPagado = (proveedor) => {
    return semanas.reduce((total, semana) => {
      return total + obtenerTotalesSemana(proveedor, semana.key).pagado;
    }, 0);
  };

  // Calcular saldo pendiente por proveedor
  const calcularSaldoPendienteProveedor = (proveedor) => {
    return calcularTotalProveedor(proveedor) - calcularTotalPagado(proveedor);
  };

  // Calcular total general de todos los proveedores
  const calcularTotalGeneral = () => {
    return proveedores.reduce((total, proveedor) => {
      return total + calcularTotalProveedor(proveedor);
    }, 0);
  };

  // Calcular total pagado general de todos los proveedores
  const calcularTotalPagadoGeneral = () => {
    return proveedores.reduce((total, proveedor) => {
      return total + calcularTotalPagado(proveedor);
    }, 0);
  };

  // Calcular saldo pendiente general de todos los proveedores filtrados
  const calcularSaldoPendienteGeneral = () => {
    return proveedoresFiltrados.reduce((total, p) => {
      return total + calcularSaldoPendienteProveedor(p);
    }, 0);
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

  if (mostrarModalDetalle && proveedorSeleccionado) {
    return (
      <FichaProveedor 
        proveedor={proveedorSeleccionado}
        semanas={semanas}
        semanaAbiertaInicial={semanaAbierta}
        onClose={() => setMostrarModalDetalle(false)}
        onSave={guardarDetalleProveedor}
      />
    );
  }

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
          <button className="btn-reporte-anual" onClick={descargarReporteAnualCSV}>
            📥 Reporte Anual
          </button>
        </div>
      </div>
      
      {/* Modal para agregar semana */}
      {mostrarModal && (
        <div className="modal">
          <div className="modal-contenido">
            <h3>Agregar Nueva Semana</h3>

            {/* Dropdown de semanas del año */}
            <div className="semanas-anio-section">
              <button
                className="btn btn-dropdown-toggle"
                onClick={() => setMostrarDropdownSemanas(!mostrarDropdownSemanas)}
              >
                📅 {mostrarDropdownSemanas ? 'Ocultar' : 'Seleccionar'} Semana del Año
                <span className={`dropdown-arrow ${mostrarDropdownSemanas ? 'open' : ''}`}>▼</span>
              </button>

              {mostrarDropdownSemanas && (
                <div className="dropdown-semanas-list">
                  {generarSemanasAnioActual().map(s => (
                    <button
                      key={s.key}
                      className={`dropdown-semana-item ${s.yaExiste ? 'ya-existe' : ''}`}
                      disabled={s.yaExiste}
                      onClick={() => {
                        if (!s.yaExiste) {
                          // Convertir DD/MM/YYYY a YYYY-MM-DD para los inputs date
                          const [d1, m1, a1] = s.inicio.split('/');
                          const [d2, m2, a2] = s.fin.split('/');
                          setNuevaSemana({
                            inicio: `${a1}-${m1}-${d1}`,
                            fin: `${a2}-${m2}-${d2}`
                          });
                          setMostrarDropdownSemanas(false);
                        }
                      }}
                    >
                      <span className="semana-num">S{s.numSemana}</span>
                      <span className="semana-rango">{s.inicio} — {s.fin}</span>
                      {s.yaExiste && <span className="ya-existe-badge">Ya existe</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="separador-modal">
              <span>o ingrese fechas manualmente</span>
            </div>

            <div className="modal-inputs">
              <div className="input-group">
                <label>Fecha de inicio:</label>
                <input
                  type="date"
                  value={nuevaSemana.inicio}
                  onChange={(e) => setNuevaSemana({...nuevaSemana, inicio: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Fecha de fin:</label>
                <input
                  type="date"
                  value={nuevaSemana.fin}
                  onChange={(e) => setNuevaSemana({...nuevaSemana, fin: e.target.value})}
                />
              </div>
            </div>
            <div className="modal-botones">
              <button className="btn btn-primary" onClick={agregarSemana}>
                Agregar
              </button>
              <button className="btn btn-cancelar" onClick={() => { setMostrarModal(false); setMostrarDropdownSemanas(false); }}>
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
              {semanasAMostrar.map(semana => (
                <th key={semana.key} className="semana-header">
                  <div className="semana-titulo">
                    <span>{semana.inicio}</span>
                    <span>a</span>
                    <span>{semana.fin}</span>
                  </div>
                  <div className="semana-acciones">
                    <button 
                      className="btn-descargar-csv"
                      onClick={() => descargarCSV(semana.key)}
                      title="Descargar Reporte Detallado (Factura por Fila)"
                    >
                      📄 Detalle
                    </button>
                    <button 
                      className="btn-descargar-resumen"
                      onClick={() => descargarResumenCSV(semana.key)}
                      title="Descargar Resumen General (Monto Total/Pagado)"
                    >
                      📊 Resumen
                    </button>
                    <button 
                      className="btn-eliminar-semana"
                      onClick={() => eliminarSemana(semana.key)}
                      title="Eliminar semana"
                    >
                      ✕
                    </button>
                  </div>
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
                  <td 
                    className="proveedor-nombre clickable"
                    onClick={() => abrirDetalleProveedor(proveedor)}
                  >
                    <div className="nombre-wrapper">
                      {proveedor.nombre}
                      <span className="info-tag">VER FICHA</span>
                    </div>
                  </td>
                  {semanasAMostrar.map(semana => {
                    const totales = obtenerTotalesSemana(proveedor, semana.key);
                    const deudaMeta = proveedor.deudas?.find(d => d.semana === semana.key) || {};
                    
                    return (
                      <td key={semana.key} className={deudaMeta.pagadoCompleto || (totales.monto > 0 && totales.saldo === 0) ? 'deuda pagado' : 'deuda'}>
                        <div className="contenido-deuda">
                          <div className="monto-summary" onClick={() => abrirDetalleProveedor(proveedor, semana.key)}>
                            <div className="summary-row">
                              <span className="label">Total Deuda:</span>
                               <span className="value">${totales.monto.toLocaleString()}</span>
                            </div>
                            <div className="summary-row">
                              <span className="label">Saldo:</span>
                              <span className={`value ${totales.saldo > 0 ? 'pendiente' : 'al-dia'}`}>
                                ${totales.saldo.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          
                          <label className="checkbox-pagado">
                            <input
                              type="checkbox"
                              checked={deudaMeta.pagadoCompleto}
                              onChange={(e) => actualizarPagoCompleto(proveedor.id, semana.key, e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            Marcar pagado
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
                        className="btn btn-descargar-individual"
                        onClick={() => descargarReporteProveedorCSV(proveedor)}
                        title="Descargar Estado de Cuenta Completo"
                      >
                        📥 Reporte
                      </button>
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
                <td colSpan={semanasAMostrar.length + 5} className="sin-resultados">
                  {proveedores.length === 0 ? 'No hay proveedores registrados' : 'No se encontraron resultados'}
                </td>
              </tr>
            )}
          </tbody>
          
          {/* Footer con totales por semana */}
          <tfoot className="tabla-footer">
            <tr>
              <td className="footer-label">TOTAL SEMANAL:</td>
              {semanasAMostrar.map(semana => {
                const totalSemana = proveedoresFiltrados.reduce((sum, p) => {
                  return sum + obtenerTotalesSemana(p, semana.key).saldo;
                }, 0);
                
                return (
                  <td key={semana.key} className="footer-monto">
                    ${totalSemana.toLocaleString()}
                  </td>
                );
              })}
              <td className="footer-monto-total">
                ${proveedoresFiltrados.reduce((sum, p) => sum + calcularTotalProveedor(p), 0).toLocaleString()}
              </td>
              <td className="footer-monto-total">
                ${proveedoresFiltrados.reduce((sum, p) => sum + calcularTotalPagado(p), 0).toLocaleString()}
              </td>
              <td className="footer-monto-total highlighted">
                ${proveedoresFiltrados.reduce((sum, p) => sum + calcularSaldoPendienteGeneral(), 0).toLocaleString()}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default CuentasPorPagar;