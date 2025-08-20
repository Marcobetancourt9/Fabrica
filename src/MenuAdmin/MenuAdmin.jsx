import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './MenuAdmin.css';

const MenuAdmin = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Panel Admin</h2>
          <button className="menu-toggle" onClick={toggleMenu}>
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>
        
        <nav className="admin-nav">
          <ul>
            <li className={location.pathname === '/product-form' ? 'active' : ''}>
              <Link to="/product-form">
                <i className="fas fa-plus-circle"></i>
                <span>Agregar Producto</span>
              </Link>
            </li>
            <li className={location.pathname === '/borrar' ? 'active' : ''}>
              <Link to="/borrar">
                <i className="fas fa-trash-alt"></i>
                <span>Eliminar Productos</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="profile-avatar">
              <i className="fas fa-user-shield"></i>
            </div>
            <div className="profile-info">
              <span className="profile-name">Administrador</span>
              <span className="profile-role">Super Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-content">
          <h3>Bienvenido al Panel de</h3>
          <h3>Administración</h3>
          <p>Selecciona una opción del menú para comenzar.</p>
          
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <div className="card-icon blue">
                <i className="fas fa-box-open"></i>
              </div>
              <h3>Productos</h3>
              <p>Administra tu inventario</p>
              <Link to="/product-form" className="card-link">Ir a Productos →</Link>
            </div>
            
            <div className="dashboard-card">
              <div className="card-icon red">
                <i className="fas fa-trash"></i>
              </div>
              <h3>Eliminar</h3>
              <p>Gestiona eliminaciones</p>
              <Link to="/borrar" className="card-link">Ir a Eliminar →</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MenuAdmin;