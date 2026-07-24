import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../credentials';

/**
 * Registra un evento en el historial de operaciones.
 * @param {string} accion - Tipo de acción (CREACIÓN, EDICIÓN, ELIMINACIÓN)
 * @param {string} modulo - Módulo donde ocurrió (ej. 'Cuentas por Pagar')
 * @param {string} idRegistro - ID del documento afectado
 * @param {Object} detalles - Objeto con detalles adicionales sobre los cambios
 */
export const registrarHistorial = async (accion, modulo, idRegistro, detalles = {}) => {
  try {
    const user = auth.currentUser;
    const payload = {
      accion,
      modulo,
      idRegistro,
      usuario: user ? (user.email || user.uid) : 'Desconocido',
      fecha: serverTimestamp(),
      detalles
    };
    await addDoc(collection(db, 'historial_cuentas'), payload);
  } catch (error) {
    console.error('Error registrando historial:', error);
  }
};
