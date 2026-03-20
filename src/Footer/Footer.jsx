import React from 'react';
import { InstallAppButton } from '../PWA/InstallAppButton'; 
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-wave"></div>
      {/* Sección Destacada de Instalación PWA */}
      {/* <section className="pwa-install-section">
      {/*   <div className="pwa-install-content">
      {/*     <h3>Lleva la Fábrica en tu bolsillo</h3>
      {/*     <p>Instala nuestra aplicación para un acceso rápido y notificaciones en tiempo real.</p>
      {/*     <div className="pwa-btn-container">
      {/*       <InstallAppButton />
      {/*     </div>
        </div>
      </section>

      {/* Copyright y enlaces legales - MEJORADO */}
      <div className="copyright-container">
        <div className="copyright-content">
          <div className="copyright-text">
            <p>© {new Date().getFullYear()} Inversiones Pincho Pan Express II C.A. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;