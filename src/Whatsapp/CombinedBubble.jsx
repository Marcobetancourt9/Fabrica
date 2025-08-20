import React, { useEffect, useState } from 'react';
import { auth } from '../../credentials';
import { onAuthStateChanged } from 'firebase/auth';
import { FaUserShield, FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './CombinedBubble.css';

const CombinedBubble = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [clickEffect, setClickEffect] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && (currentUser.email === 'centroopticooggi@gmail.com' || currentUser.email === 'marco.betancourt@correo.unimet.edu.ve')) {
        setIsAdmin(true);
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAdminClick = () => {
    setClickEffect(true);
    setTimeout(() => setClickEffect(false), 600);
    navigate('/menuadmin');
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/+584125936487', '_blank');
  };

  // Always show the bubble, just change its functionality based on isAdmin
  return (
    <div 
      className={`combined-bubble ${isAdmin ? 'admin' : 'whatsapp'} ${isAnimating ? 'animating' : ''} ${clickEffect ? 'clicked' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isAdmin ? handleAdminClick : handleWhatsAppClick}
      aria-label={isAdmin ? "Panel de administrador" : "Contactar por WhatsApp"}
    >
      <div className="bubble-core">
        <div className="icon-container">
          {isAdmin ? (
            <FaUserShield className="bubble-icon" />
          ) : (
            <FaWhatsapp className="bubble-icon" />
          )}
        </div>
      </div>
      
      {isHovered && (
        <div className="tooltip">
          {isAdmin ? "Panel de administrador" : "Contactar por WhatsApp"}
        </div>
      )}
      
      {clickEffect && isAdmin && (
        <div className="particles">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="particle" style={{
              '--angle': `${i * 45}deg`,
              '--delay': `${i * 0.05}s`
            }} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CombinedBubble;