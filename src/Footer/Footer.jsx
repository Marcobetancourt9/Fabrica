import React from 'react';
import { InstallAppButton } from '../PWA/InstallAppButton'; 
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-wave"></div>
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