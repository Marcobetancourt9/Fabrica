import React from 'react';
import { FaFacebookF, FaInstagram, FaTwitter, FaWhatsapp, FaMapMarkerAlt, FaPhone, FaEnvelope, FaClock } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-wave"></div>
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