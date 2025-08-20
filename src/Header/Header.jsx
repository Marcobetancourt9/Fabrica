import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import './Header.css';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 30;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        {/* Logo centrado */}
        <div className="logo-container">
          <Link to="/" className="logo-link">
            <img 
              src="https://ppfmspwqiqawiiexaanb.supabase.co/storage/v1/object/public/imagenesoggi//oggi.png" 
              alt="Pincho Pan Fabrica" 
              className="logo"
            />
          </Link>
        </div>

        {/* Menú de navegación para desktop */}
        <nav className="desktop-nav">
          <div className="nav-links-container left-links">
            <Link to="/proveedores" className="nav-link">PROVEEDORES</Link>
            <Link to="/pedidos" className="nav-link">PEDIDOS</Link>
          </div>
          
          <div className="nav-links-container right-links">
            <Link to="/productos" className="nav-link">PRODUCTOS</Link>
            <Link to="/contacto" className="nav-link">CONTACTO</Link>
          </div>
        </nav>

        {/* Botón de hamburguesa para mobile */}
        <button className="mobile-menu-button" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Menú móvil */}
        <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          <Link to="/monturas" className="mobile-nav-link" onClick={toggleMobileMenu}>MONTURAS</Link>
          <Link to="/lentescontacto" className="mobile-nav-link" onClick={toggleMobileMenu}>LENTES DE CONTACTO</Link>
          <Link to="/productos" className="mobile-nav-link" onClick={toggleMobileMenu}>PRODUCTOS</Link>
          <Link to="/contacto" className="mobile-nav-link" onClick={toggleMobileMenu}>CONTACTO</Link>
        </div>
      </div>
    </header>
  );
};

export default Header;