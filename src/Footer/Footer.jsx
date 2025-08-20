import React, { useState, useEffect, useRef } from 'react';
import { FaFacebookF, FaInstagram, FaTwitter, FaWhatsapp, FaDownload } from 'react-icons/fa';
import { HiOutlineMail } from 'react-icons/hi';
import { BsCreditCard, BsCashCoin, BsBank2 } from 'react-icons/bs';
import './Footer.css';

const Footer = () => {
  const [installable, setInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredPrompt = useRef(null);

  // Detectar dispositivo y modo PWA
  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) || 
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  // Manejar evento de instalación
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt.current) {
      alert("La app ya está instalada o tu navegador no soporta la instalación.");
      return;
    }

    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    
    console.log(`Usuario ${outcome} la instalación`);
    deferredPrompt.current = null;
    setInstallable(false);
  };

  const showIOSInstructions = () => {
    alert("Para instalar la app:\n1. Toca el ícono de compartir\n2. Selecciona 'Añadir a inicio'");
  };

  return (
    <footer className="footer">
      <div className="footer-wave"></div>
      
      <div className="footer-container">
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
              <p><FaWhatsapp className="contact-icon" /> +58 412-1234567</p>
              <p><HiOutlineMail className="contact-icon" /> info@opticaoggi.com</p>
              <p>Lunes a Viernes: 9am - 6pm</p>
              <p>Sábados: 9am - 2pm</p>
            </div>
          </div>

          <div className="footer-column">
            <h3 className="footer-title">Visítanos</h3>
            <div className="location-info">
              <p>C. Cecilio Acosta, Caracas 1060, Miranda</p>
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

        <div className="footer-bottom">
          <div className="payment-methods">
            <h4>Métodos de pago aceptados:</h4>
            <div className="payment-icons">
              <div className="payment-method">
                <BsCreditCard className="payment-icon" />
                <span>Tarjetas</span>
              </div>
              <div className="payment-method">
                <BsCashCoin className="payment-icon" />
                <span>Efectivo</span>
              </div>
              <div className="payment-method">
                <BsBank2 className="payment-icon" />
                <span>Transferencias</span>
              </div>
            </div>
          </div>

        {/* Botón de instalación PWA */}
        {!isStandalone && (
          <div className="pwa-install-section">
            {installable && (
              <button onClick={handleInstallClick} className="install-app-btn">
                <FaDownload /> Instalar App
              </button>
            )}
            
            {isIOS && (
              <button onClick={showIOSInstructions} className="ios-install-btn">
                <FaDownload /> Añadir a Inicio
              </button>
            )}
          </div>
        )}

          <div className="social-media">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon">
              <FaFacebookF />
            </a>
            <a href="https://www.instagram.com/centroopticooggi/" target="_blank" rel="noopener noreferrer" className="social-icon">
              <FaInstagram />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon">
              <FaTwitter />
            </a>
          </div>
        </div>

        <div className="copyright">
          <p>© {new Date().getFullYear()} Centro Óptico Oggi. Todos los derechos reservados.</p>
          <div className="legal-links">
            <a href="/terminos">Términos y condiciones</a>
            <span> | </span>
            <a href="/privacidad">Política de privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;