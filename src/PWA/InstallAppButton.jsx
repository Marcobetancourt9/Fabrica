import React, { useState, useEffect, useRef } from 'react';
import { FaDownload, FaShareSquare } from 'react-icons/fa';
import './InstallAppButton.css';

export function InstallAppButton({ className = '' }) {
  const [installable, setInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredPrompt = useRef(null);

  // 1. Detectar dispositivo y si la app ya está instalada
  useEffect(() => {
    // Detectar iOS (iPhone, iPad, iPod o Mac con touch)
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);
            
    // Detectar si ya se está ejecutando como app independiente (instalada)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator).standalone;
    setIsStandalone(isInStandaloneMode);
  }, []);

  // 2. Escuchar el evento del navegador que permite instalar
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault(); // Evita que Chrome muestre el prompt nativo de inmediato
      deferredPrompt.current = e; // Guarda el evento para usarlo al hacer clic
      setInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // 3. Función para Android / Chrome / Edge
  const handleInstallClick = async () => {
    if (!deferredPrompt.current) return;

    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    
    console.log(`El usuario ${outcome} la instalación`);
    deferredPrompt.current = null;
    setInstallable(false);
  };

  // 4. Función para iOS (Safari no soporta el prompt automático)
  const showIOSInstructions = () => {
    alert("Para instalar la app en iOS:\n\n1. Toca el ícono de Compartir (el cuadro con la flecha hacia arriba).\n2. Desliza hacia abajo y selecciona 'Añadir a inicio' ➕.");
  };

  // Si ya está instalada (Standalone), no mostramos los botones
  if (isStandalone) return null; 

  return (
    <div className={`install-button-wrapper ${className}`}>
      {installable && (
        <button 
          id="btn-install-android"
          onClick={handleInstallClick} 
          className="pwa-install-btn main-btn"
        >
          <FaDownload className="pwa-icon" /> 
          Instalar App Fabrica
        </button>
      )}
      
      {/* En iOS casi nunca se dispara 'beforeinstallprompt', por lo que mostramos las instrucciones manuales */}
      {isIOS && !installable && (
        <button 
          id="btn-install-ios"
          onClick={showIOSInstructions} 
          className="pwa-install-btn ios-btn"
        >
          <FaShareSquare className="pwa-icon" /> 
          Instalar en iOS
        </button>
      )}
    </div>
  );
}