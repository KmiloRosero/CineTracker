import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthForm from '../components/AuthForm';
import Wordmark from '../components/Wordmark';

/** Full-page login, kept for direct navigation to #/login. */
export default function Login() {
  const navigate = useNavigate();
  return (
    <main className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] } }}
      >
        <div className="login-card__brand">
          <Wordmark size="lg" />
          <p className="login-card__tagline">Tus películas y series, narradas como una noche de partido.</p>
        </div>
        <AuthForm onSuccess={() => navigate('/', { replace: true })} idPrefix="login" />
      </motion.div>
    </main>
  );
}
