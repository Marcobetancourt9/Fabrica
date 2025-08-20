import React, { useEffect, useState } from 'react';
import { auth } from '../../credentials';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { FaSignOutAlt, FaSignInAlt, FaUserCheck, FaUserPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './AuthBubble.css';

const AuthBubble = () => {
  const [user, setUser] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [clickEffect, setClickEffect] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Trigger animation when auth state changes
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
      
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleAction = () => {
    // Click effect
    setClickEffect(true);
    setTimeout(() => setClickEffect(false), 600);

    if (user) {
      // Logout action
      signOut(auth)
        .then(() => {
          // Success animation
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 1000);
        })
        .catch((error) => {
          console.error("Error al cerrar sesión:", error);
        });
    } else {
      // Navigate to login
      navigate('/login');
    }
  };

  return (
    <div 
      className={`auth-bubble ${user ? 'logged-in' : ''} ${isAnimating ? 'animating' : ''} ${clickEffect ? 'clicked' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleAction}
      aria-label={user ? 'Cerrar sesión' : 'Iniciar sesión'}
    >
      <div className="bubble-core">
        <div className={`icon-container ${user ? 'logout' : 'login'}`}>
          {user ? (
            <>
              <FaSignOutAlt className="auth-icon main-icon" />
              <FaUserCheck className="auth-icon secondary-icon" />
            </>
          ) : (
            <>
              <FaSignInAlt className="auth-icon main-icon" />
              <FaUserPlus className="auth-icon secondary-icon" />
            </>
          )}
        </div>
      </div>
      
      {isHovered && (
        <div className="tooltip">
          {user ? `Cerrar sesión (${user.email})` : 'Iniciar sesión'}
        </div>
      )}
      
      {/* Particle effects */}
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

export default AuthBubble;