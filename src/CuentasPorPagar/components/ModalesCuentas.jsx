import React from 'react';
import { generarSemanasPorAnio } from '../utils';

const ModalesCuentas = ({
  mostrarModal,
  setMostrarModal,
  mostrarDropdownSemanas,
  setMostrarDropdownSemanas,
  nuevaSemana,
  setNuevaSemana,
  agregarSemana,
  semanas,
  anioFiltro
}) => {
  if (!mostrarModal) return null;

  return (
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
              {generarSemanasPorAnio(anioFiltro, semanas).map(s => (
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
              onChange={(e) => setNuevaSemana({ ...nuevaSemana, inicio: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label>Fecha de fin:</label>
            <input
              type="date"
              value={nuevaSemana.fin}
              onChange={(e) => setNuevaSemana({ ...nuevaSemana, fin: e.target.value })}
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
  );
};

export default ModalesCuentas;
