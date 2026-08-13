import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './Header/Header';
import Footer from './Footer/Footer';
import Inicio from './Inicio/Inicio';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './App.css';
import LoginForm from './Login/Login';
import Registro from './Registro/Registro';
import MenuAdmin from './MenuAdmin/MenuAdmin.jsx';
import CombinedBubble from './CombinedBubble/CombinedBubble.jsx';
import AuthBubble from './Loginbutton/Loginbutton';
import TotalDeudas from './TotalDeudas/TotalDeudas.jsx';
import Estadisticas from './Estadisticas/Estadisticas.jsx';
import CuentasPorPagar from './CuentasPorPagar/CuentasPorPagar.jsx';
import Pedidos from './Pedidos/Pedidos.jsx';
export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineMessage(true);
      setTimeout(() => setShowOnlineMessage(false), 4000); // Ocultar mensaje de conexión recuperada después de 4s
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Router>
      <div className="app-container">
        {!isOnline && (
          <div className="connection-banner offline">
            <i className="fas fa-wifi-slash"></i> 
            <span>Sin conexión a Internet. Modo local activado.</span>
          </div>
        )}
        {isOnline && showOnlineMessage && (
          <div className="connection-banner online">
            <i className="fas fa-wifi"></i> 
            <span>Conexión recuperada. Guardando en la nube...</span>
          </div>
        )}
        <Header className={scrolled ? 'scrolled' : ''} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/registro" element={<Registro />} />          
            <Route path="/menuadmin" element={<MenuAdmin />} />
            <Route path="/deudas" element={<TotalDeudas />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/proveedores" element={<CuentasPorPagar />} />
            <Route path="/pedidos" element={<Pedidos />} />
          </Routes> 
          </main>
        <Footer />
        <CombinedBubble />
        <AuthBubble />
      </div>
    </Router>
  );
}