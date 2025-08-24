import React from 'react';
import { FaFacebookF, FaInstagram, FaTwitter, FaWhatsapp, FaMapMarkerAlt, FaPhone, FaEnvelope, FaClock } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-wave"></div>
      
      <div className="footer-container">
        {/* Grid de columnas con información */}
        <div className="footer-grid">
          <div className="footer-column">
            <h3 className="footer-title">Servicios</h3>
            <ul className="footer-links">
              <li><a href="/financiamiento"><span className="link-icon">•</span> Sistema de Financiamiento</a></li>
              <li><a href="/apartado"><span className="link-icon">•</span> Sistema De Apartado</a></li>
              <li><a href="/devoluciones"><span className="link-icon">•</span> Política de Devolución</a></li>
              <li><a href="/reparacion"><span className="link-icon">•</span> Reparación de Lentes</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3 className="footer-title">Atención al cliente</h3>
            <ul className="footer-links">
              <li><a href="/preguntas"><span className="link-icon">•</span> Preguntas Frecuentes</a></li>
              <li><a href="/envios"><span className="link-icon">•</span> Envíos y Entregas</a></li>
              <li><a href="/trabaja-con-nosotros"><span className="link-icon">•</span> Trabaja con Nosotros</a></li>
              <li><a href="/blog"><span className="link-icon">•</span> Blog Óptico</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3 className="footer-title">Contacto</h3>
            <div className="contact-info">
              <p><FaPhone className="contact-icon" /> +58 412-1234567</p>
              <p><FaWhatsapp className="contact-icon" /> +58 412-1234567</p>
              <p><FaEnvelope className="contact-icon" /> info@opticaoggi.com</p>
              <p><FaClock className="contact-icon" /> Lunes a Viernes: 9am - 6pm</p>
              <p><FaClock className="contact-icon" /> Sábados: 9am - 2pm</p>
            </div>
          </div>

          <div className="footer-column">
            <h3 className="footer-title">Visítanos</h3>
            <div className="location-info">
              <p><FaMapMarkerAlt className="contact-icon" /> C. Cecilio Acosta, Caracas 1060, Miranda</p>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3923.123456789012!2d-66.9167!3d10.5000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDMwJzAwLjAiTiA2NsKwNTUnMDAuMCJX!5e0!3m2!1sen!2sve!4v1234567890123!5m2!1sen!2sve" 
                width="100%" 
                height="150" 
                style={{border:0}} 
                allowFullScreen="" 
                loading="lazy"
                title="Ubicación Óptica Oggi">
              </iframe>
            </div>
          </div>
        </div>

        {/* Copyright y enlaces legales - MEJORADO */}
        <div className="copyright-container">
          <div className="copyright-content">
            <div className="copyright-text">
              <p>© {new Date().getFullYear()} Inversiones Pincho Pan Express II C.A. Todos los derechos reservados.</p>
            </div>
            <div className="legal-links">
              <a href="/terminos">Términos y condiciones</a>
              <span className="separator">|</span>
              <a href="/privacidad">Política de privacidad</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;