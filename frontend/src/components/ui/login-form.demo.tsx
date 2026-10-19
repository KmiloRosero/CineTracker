import { useState } from 'react';
import { SmokeyBackground, LoginForm, type AuthMode, type AuthField, type LoginFormValues } from '@/components/ui/login-form';

/**
 * Stand-alone demo of the smoke background and the glass card, with local
 * state only. The app uses them through AuthForm (LoginModal and #/login).
 */
export default function LoginFormDemo() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [values, setValues] = useState<LoginFormValues>({ name: '', email: '', password: '', confirm: '' });
  const [remember, setRemember] = useState(true);

  return (
    <main className="relative h-screen w-screen bg-slab-black">
      <SmokeyBackground className="absolute inset-0" />
      <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
        <LoginForm
          mode={mode}
          values={values}
          remember={remember}
          onChange={(field: AuthField, value: string) => setValues((v) => ({ ...v, [field]: value }))}
          onRememberChange={setRemember}
          onModeChange={setMode}
          onSubmit={() => {}}
        />
      </div>
    </main>
  );
}
