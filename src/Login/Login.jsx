"use client";
import React, { useState, useEffect } from "react";
import styles from "./Login.module.css";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { app, db } from "../../credentials";
import { useNavigate } from "react-router-dom";
import { getDoc, setDoc, doc } from "firebase/firestore";
import { FaEye, FaEyeSlash, FaGoogle, FaUser, FaLock } from "react-icons/fa";

const auth = getAuth(app);

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const cleanedEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanedEmail)) {
      setError("Por favor, ingresa un email válido.");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setError("Por favor, ingresa tu contraseña.");
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, cleanedEmail, password);
      navigate("/");
    } catch (error) {
      console.error("Error de autenticación:", error.message);
      setIsLoading(false);
      
      switch(error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
          setError("Credenciales incorrectas. Verifica tus datos.");
          break;
        case "auth/user-not-found":
          setError("No existe una cuenta con este correo.");
          break;
        case "auth/too-many-requests":
          setError("Demasiados intentos. Intenta más tarde.");
          break;
        default:
          setError("Error al iniciar sesión. Inténtalo de nuevo.");
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const response = await signInWithPopup(auth, provider);
      const user = response.user;
      
      // Verificar si el usuario ya existe en Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          nombre: user.displayName?.split(" ")[0] || "Desconocido",
          apellido: user.displayName?.split(" ")[1] || "Desconocido",
          email: user.email || "Desconocido",
          genero: "Desconocido",
          telefono: "Desconocido",
          direccion: "Desconocido",
          uid: user.uid,
          fechaCreacion: new Date(),
          fotoPerfil: user.photoURL || "default-avatar.png",
        });
      }
      
      navigate("/");
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      setError("Error al iniciar sesión con Google. Inténtalo de nuevo.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.logoContainer}>
          <img 
            src="https://ppfmspwqiqawiiexaanb.supabase.co/storage/v1/object/public/imagenesoggi//oggi.png" 
            alt="Pincho Pan Fabrica" 
            className={styles.logo}
          />
          <h1 className={styles.title}>Bienvenido a Pincho Pan Fabrica</h1>
          <p className={styles.subtitle}>Inicia sesión para acceder a tu cuenta</p>
        </div>

        <form onSubmit={handleLogin} className={styles.loginForm}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.inputGroup}>
            <FaUser className={styles.inputIcon} />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.inputField}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <FaLock className={styles.inputIcon} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.inputField}
              required
            />
            <button 
              type="button" 
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.spinner}></span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>

          <div className={styles.forgotPassword}>
            <a href="/recuperar-contrasena">¿Olvidaste tu contraseña?</a>
          </div>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          <span className={styles.dividerText}>o</span>
          <span className={styles.dividerLine}></span>
        </div>

        <button 
          className={styles.googleButton}
          onClick={handleGoogleLogin}
        >
          <FaGoogle className={styles.googleIcon} />
          Continuar con Google
        </button>

        <div className={styles.signupLink}>
          ¿No tienes una cuenta? <a href="/registro">Regístrate</a>
        </div>
      </div>

      <div className={styles.footer}>
        <p>© {new Date().getFullYear()} Pincho Pan Fabrica. Todos los derechos reservados.</p>
        <div className={styles.legalLinks}>
          <a href="/terminos">Términos de servicio</a>
          <span> | </span>
          <a href="/privacidad">Política de privacidad</a>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;