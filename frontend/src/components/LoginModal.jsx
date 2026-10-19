import React from 'react';
import Modal from './Modal';
import AuthForm from './AuthForm';
import Wordmark from './Wordmark';
import { SmokeyBackground } from '@/components/ui/login-form';
import { useAuth } from '../context/AuthContext';

/**
 * Login / register over any page, as a glass card on pitch-green smoke; after
 * success the action that asked for it resumes. Clicking the smoke closes it.
 */
export default function LoginModal() {
  const { loginModalOpen, closeLoginModal, onLoginSuccess } = useAuth();

  return (
    <Modal
      open={loginModalOpen}
      onClose={closeLoginModal}
      label="Inicia sesión para continuar"
      className="login-glass"
      backdrop={<SmokeyBackground backdropBlurAmount="sm" />}
    >
      {/* keyed so each opening starts from a clean form */}
      {loginModalOpen && (
        <AuthForm
          key="login-modal"
          onSuccess={onLoginSuccess}
          onClose={closeLoginModal}
          headingLevel="h2"
          idPrefix="lm"
          brand={<Wordmark size="md" />}
        />
      )}
    </Modal>
  );
}
