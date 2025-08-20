import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Inicio.css';

// Importa tus imágenes (asegúrate de tener estas imágenes en tu proyecto)

const monturasImg = '/images/monturas.JPG';
const lentesContactoImg = '/images/lentes-contacto.jpg';
const lentesSolImg = '/images/lentes-sol.png';

const Inicio = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (category) => {
    // Define las rutas según la categoría
    switch(category) {
      case 'monturas':
        navigate('/monturas');
        break;
      case 'lentes-contacto':
        navigate('/lentescontacto');
        break;
      case 'lentes-sol':
        navigate('/lentessol');
        break;
      default:
        navigate('/productos');
    }
  };

  return (
    <div className="inicio-container">
      <section className="hero-section">
        <div className="hero-content">
          <img 
            src="https://ppfmspwqiqawiiexaanb.supabase.co/storage/v1/object/public/imagenesoggi//oggi.png" 
            alt="Oggi Logo" 
            className="oggi-logo"
          />
          <h1 className="hero-title">
            <span className="hero-title-line1">¡Oggi tu centro óptico ideal!</span>
          </h1>
          <img 
            src="https://ppfmspwqiqawiiexaanb.supabase.co/storage/v1/object/public/imagenesoggi//cashea.png" 
            alt="Cashea Logo" 
            className="cashea-logo"
          />
          <p className="hero-subtitle">Tiendas con <span className="highlight">Cashea</span></p>
          <div className="cashea-tagline">Compra en cuotas lo que necesitas hoy</div>
          <button 
            className="hero-button" 
            onClick={() => window.location.href="https://mobile.cashea.app/merchants/48e697d1-6474-4e97-8428-0151976837ae"}>
            Descubre más
          </button>
          <br />
          <br />
          <br />
        </div>
        <div className="hero-wave"></div>
      </section>

      {/* Product Categories con imágenes */}
      <section className="product-categories">
        <h2 className="section-title">Nuestros Productos</h2>
        <p className="section-subtitle">Calidad y estilo para tu visión</p>
        
        <div className="categories-grid">
          <div className="category-card">
            <div className="category-image" style={{ backgroundImage: `url(${monturasImg})` }}></div>
            <div className="category-content">
              <h3 className="category-title">Monturas</h3>
              <p className="category-description">Las últimas tendencias en monturas para todos los estilos</p>
              <button 
                className="category-button"
                onClick={() => handleCategoryClick('monturas')}
              >
                Comprar ahora
              </button>
            </div>
          </div>

          <div className="category-card">
            <div className="category-image" style={{ backgroundImage: `url(${lentesContactoImg})` }}></div>
            <div className="category-content">
              <h3 className="category-title">Lentes de Contacto</h3>
              <p className="category-description">Comodidad y claridad para tus ojos</p>
              <button 
                className="category-button"
                onClick={() => handleCategoryClick('lentes-contacto')}
              >
                Comprar ahora
              </button>
            </div>
          </div>

          <div className="category-card">
            <div className="category-image" style={{ backgroundImage: `url(${lentesSolImg})` }}></div>
            <div className="category-content">
              <h3 className="category-title">Lentes de sol</h3>
              <p className="category-description">Protección UV con estilo</p>
              <button 
                className="category-button"
                onClick={() => handleCategoryClick('lentes-sol')}
              >
                Comprar ahora
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Inicio;