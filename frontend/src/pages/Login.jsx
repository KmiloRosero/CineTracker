import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import Wordmark from '../components/Wordmark';
import { SmokeyBackground } from '@/components/ui/login-form';

/** Full-page login (#/login): the glass card centred on pitch-green smoke. */
export default function Login() {
  const navigate = useNavigate();
  return (
    <main className="login-page">
      <SmokeyBackground backdropBlurAmount="sm" />
      <div className="login-page__stage">
        <AuthForm onSuccess={() => navigate('/', { replace: true })} idPrefix="login" brand={<Wordmark size="md" />} />
      </div>
    </main>
  );
}
