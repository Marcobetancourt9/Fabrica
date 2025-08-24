"use client";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Registro.module.css";
import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { app, db } from "../../credentials";
import { FaGoogle, FaUser, FaEnvelope, FaPhone, FaIdCard, FaMapMarkerAlt, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

const auth = getAuth(app);

function Registro() {
  return (
    <div className={styles.registroContainer}>
      <div className={styles.registroCard}>
        <div className={styles.logoContainer}>
          <img 
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/3edde6bb0a5d03a5675a4386cedea6018b11ddde" 
            alt="Pincho Pan Fabrica" 
            className={styles.logo}
          />
          <h1 className={styles.title}>Crea tu cuenta en Pincho Pan Fabrica</h1>
          <p className={styles.subtitle}>Regístrate para disfrutar de todos nuestros servicios</p>
        </div>

        <RegistroForm />
        
        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          <span className={styles.dividerText}>o</span>
          <span className={styles.dividerLine}></span>
        </div>

        <GoogleSignUp />
        
        <div className={styles.loginLink}>
          ¿Ya tienes una cuenta? <a href="/login">Inicia sesión</a>
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

function RegistroForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    documento: "",
    direccion: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateFields = () => {
    const { nombre, email, telefono, documento, direccion, password, confirmPassword } = formData;

    if (!nombre || !email || !telefono || !documento || !direccion || !password || !confirmPassword) {
      setError("Todos los campos son requeridos");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresa un correo electrónico válido");
      return false;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateFields()) return;

    try {
      setLoading(true);
      const { email, password, confirmPassword, ...userData } = formData;
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        ...userData,
        email,
        uid: user.uid,
        fechaCreacion: new Date(),
        fotoPerfil: "default-avatar.png",
        rol: "cliente"
      });

      navigate("/");
    } catch (err) {
      console.error("Error en registro:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya está registrado");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña es muy débil");
      } else {
        setError("Ocurrió un error al registrarse");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.registroForm}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.inputGroup}>
        <FaUser className={styles.inputIcon} />
        <input
          type="text"
          name="nombre"
          placeholder="Nombre"
          value={formData.nombre}
          onChange={handleChange}
          className={styles.inputField}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <FaUser className={styles.inputIcon} />
        <input
          type="text"
          name="apellido"
          placeholder="Apellido"
          value={formData.apellido}
          onChange={handleChange}
          className={styles.inputField}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <FaEnvelope className={styles.inputIcon} />
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={formData.email}
          onChange={handleChange}
          className={styles.inputField}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <FaPhone className={styles.inputIcon} />
        <input
          type="tel"
          name="telefono"
          placeholder="Teléfono"
          value={formData.telefono}
          onChange={handleChange}
          className={styles.inputField}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <FaIdCard className={styles.inputIcon} />
        <input
          type="text"
          name="documento"
          placeholder="Documento de identidad"
          value={formData.documento}
          onChange={handleChange}
          className={styles.inputField}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <FaMapMarkerAlt className={styles.inputIcon} />
        <input
          type="text"
          name="direccion"
          placeholder="Dirección"
          value={formData.direccion}
          onChange={handleChange}
          className={styles.inputField}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <FaLock className={styles.inputIcon} />
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={handleChange}
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

      <div className={styles.inputGroup}>
        <FaLock className={styles.inputIcon} />
        <input
          type={showConfirmPassword ? "text" : "password"}
          name="confirmPassword"
          placeholder="Confirmar contraseña"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={styles.inputField}
          required
        />
        <button 
          type="button" 
          className={styles.passwordToggle}
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      <button 
        type="submit" 
        className={styles.registroButton}
        disabled={loading}
      >
        {loading ? (
          <span className={styles.spinner}></span>
        ) : (
          "Registrarse"
        )}
      </button>
    </form>
  );
}

function GoogleSignUp() {
  const navigate = useNavigate();

  const handleGoogleSignUp = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const response = await signInWithPopup(auth, provider);
      const user = response.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          nombre: user.displayName?.split(" ")[0] || "Usuario",
          apellido: user.displayName?.split(" ")[1] || "Google",
          email: user.email || "",
          telefono: "Por definir",
          documento: "Por definir",
          direccion: "Por definir",
          uid: user.uid,
          fechaCreacion: new Date(),
          fotoPerfil: user.photoURL || "default-avatar.png",
          rol: "cliente"
        });
      }
      
      navigate("/");
    } catch (error) {
      console.error("Error en registro con Google:", error);
      alert("Error al registrarse con Google. Intenta nuevamente.");
    }
  };

  return (
    <button 
      className={styles.googleButton}
      onClick={handleGoogleSignUp}
    >
      <FaGoogle className={styles.googleIcon} />
      Registrarse con Google
    </button>
  );
}

export default Registro;