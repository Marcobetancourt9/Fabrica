import React, { useEffect, useState } from 'react';
import { auth } from '../../credentials';
import { onAuthStateChanged } from 'firebase/auth';
import { FaUserShield } from 'react-icons/fa';
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



  if (!isAdmin) return null;

  return (
    <div 
      className={`combined-bubble admin ${isAnimating ? 'animating' : ''} ${clickEffect ? 'clicked' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleAdminClick}
      aria-label="Panel de administrador"
    >
      <div className="bubble-core">
        <div className="icon-container">
          <FaUserShield className="bubble-icon" />
        </div>
      </div>
      
      {isHovered && (
        <div className="tooltip">
          Panel de administrador
        </div>
      )}
      
      {clickEffect && (
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