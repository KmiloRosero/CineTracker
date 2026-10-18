import React from 'react';
import Modal from './Modal';
import AuthForm from './AuthForm';
import Wordmark from './Wordmark';
import { IconClose } from './Icons';
import { useAuth } from '../context/AuthContext';

/** Login / register over any page; after success the action that asked for it resumes. */
export default function LoginModal() {
  const { loginModalOpen, closeLoginModal, onLoginSuccess } = useAuth();

  return (
    <Modal open={loginModalOpen} onClose={closeLoginModal} label="Inicia sesión para continuar" className="login-modal">
      <div className="login-modal__brand">
        <Wordmark size="sm" />
        <button className="modal__close" onClick={closeLoginModal} aria-label="Cerrar">
          <IconClose size={16} />
        </button>
      </div>
      {/* keyed so each opening starts from a clean form */}
      {loginModalOpen && <AuthForm key="login-modal" onSuccess={onLoginSuccess} headingLevel="h2" idPrefix="lm" />}
    </Modal>
  );
}
