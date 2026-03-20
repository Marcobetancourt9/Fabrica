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

  useEffect(() => {
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

  return (
    <Router>
      <div className="app-container">
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