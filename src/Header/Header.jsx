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
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/3edde6bb0a5d03a5675a4386cedea6018b11ddde" 
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
            <Link to="/deudas" className="nav-link">TOTAL DEUDAS</Link>
            <Link to="/estadisticas" className="nav-link">ESTADISTICAS</Link>
          </div>
        </nav>

        {/* Botón de hamburguesa para mobile */}
        <button className="mobile-menu-button" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Menú móvil */}
        <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          <Link to="/proveedores" className="mobile-nav-link" onClick={toggleMobileMenu}>PROVEEDORES</Link>
          <Link to="/pedidos" className="mobile-nav-link" onClick={toggleMobileMenu}>PEDIDOS</Link>
          <Link to="/deudas" className="mobile-nav-link" onClick={toggleMobileMenu}>TOTAL DEUDAS</Link>
          <Link to="/estadisticas" className="mobile-nav-link" onClick={toggleMobileMenu}>ESTADISTICAS</Link>
        </div>
      </div>
    </header>
  );
};

export default Header;