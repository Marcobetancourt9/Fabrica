import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../credentials';
import './Inicio.css';

const auth = getAuth(app);

const Inicio = () => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName?.split(' ')[0] || user.email?.split('@')[0] || '');
      } else {
        setUserName('');
      }
    });

    return () => unsubscribe();
  }, []);

  const categories = [
    {
      title: 'Proveedores',
      desc: 'Gestión completa de proveedores y cuentas por pagar.',
      icon: 'fas fa-users',
      link: '/proveedores',
      delay: '0.1s'
    },
    {
      title: 'Total Deudas',
      desc: 'Control detallado de deudas pendientes y pagos.',
      icon: 'fas fa-file-invoice-dollar',
      link: '/deudas',
      delay: '0.2s'
    },
    {
      title: 'Estadísticas',
      desc: 'Análisis visual del rendimiento y finanzas.',
      icon: 'fas fa-chart-pie',
      link: '/estadisticas',
      delay: '0.3s'
    },
    {
      title: 'Pedidos',
      desc: 'Seguimiento de órdenes e inventario.',
      icon: 'fas fa-truck-ramp-box',
      link: '/pedidos',
      delay: '0.4s'
    }
  ];

  return (
    <div className="inicio-container">
      {/* Background Orbs */}
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <header className="hero-section">
        <div className="hero-glass-card">
          <div className="fabrica-logo-container">
            <img 
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/3edde6bb0a5d03a5675a4386cedea6018b11ddde" 
              alt="Pincho Pan Fabrica" 
              className="fabrica-logo"
            />
          </div>
          <h1 className="hero-title">
            {userName ? `¡Hola, ${userName}!` : 'Pincho Pan Fabrica'}
          </h1>
          <p className="hero-subtitle">
            {userName 
              ? 'Bienvenido de nuevo a tu centro de control. Gestiona tu fábrica con eficiencia.'
              : 'Sistema Inteligente de Gestión de Productos y Finanzas. Optimiza tu flujo de trabajo con nuestra plataforma centralizada.'
            }
          </p>
        </div>
      </header>

      <main>
        <div className="dashboard-grid">
          {categories.map((cat, index) => (
            <Link 
              key={index} 
              to={cat.link} 
              className="nav-card" 
              style={{ animationDelay: cat.delay }}
            >
              <div className="card-icon">
                <i className={cat.icon}></i>
              </div>
              <h3 className="card-title">{cat.title}</h3>
              <p className="card-desc">{cat.desc}</p>
            </Link>
          ))}
        </div>

        {/* Dynamic Stats Banner */}
        <section className="stats-banner">
          <div className="stats-container">
            <div className="stat-item">
              <span className="stat-value">100%</span>
              <span className="stat-label">Control</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">Real-Time</span>
              <span className="stat-label">Sincronización</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">Security</span>
              <span className="stat-label">Protección</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Inicio;