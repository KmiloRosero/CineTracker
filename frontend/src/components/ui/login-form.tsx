import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Transition } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Smokey background ───────────────────────────────────────────────────────

const vertexSmokeySource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// Smoke: a domain-warped wave whose glow takes `u_color`; the pointer bends it.
const fragmentSmokeySource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
    float time = iTime * 0.5;

    // pointer from 0..1 remapped to -1..1
    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;

    vec2 distortion = centeredUV;
    for (float i = 1.0; i < 8.0; i++) {
        distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
        distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
    }

    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.9, 0.2, wave);

    fragColor = vec4(u_color * glow, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

/** Valid blur sizes supported by Tailwind CSS. */
type BlurSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface SmokeyBackgroundProps {
  backdropBlurAmount?: BlurSize;
  /** Smoke colour as #rrggbb. Defaults to CineTracker's pitch green. */
  color?: string;
  className?: string;
}

const blurClassMap: Record<BlurSize, string> = {
  none: 'backdrop-blur-none',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
  '2xl': 'backdrop-blur-2xl',
  '3xl': 'backdrop-blur-3xl',
};

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.substring(1, 3), 16) / 255,
  parseInt(hex.substring(3, 5), 16) / 255,
  parseInt(hex.substring(5, 7), 16) / 255,
];

/**
 * An interactive WebGL smoke background. GL state is created once per colour;
 * the pointer is read from the window (content usually covers the canvas) and
 * eased toward, the loop pauses while the window is hidden, and under reduced
 * motion a single still frame is drawn. Without WebGL the dark ground remains.
 */
export function SmokeyBackground({
  backdropBlurAmount = 'sm',
  color = '#018751',
  className = '',
}: SmokeyBackgroundProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' });
    if (!gl) return undefined;

    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSmokeySource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSmokeySource);
    const program = gl.createProgram();
    if (!vertexShader || !fragmentShader || !program) return undefined;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return undefined;
    }
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const iResolution = gl.getUniformLocation(program, 'iResolution');
    const iTime = gl.getUniformLocation(program, 'iTime');
    const iMouse = gl.getUniformLocation(program, 'iMouse');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const [r, g, b] = hexToRgb(color);
    gl.uniform3f(uColor, r, g, b);

    // pointer in 0..1 (y up), eased each frame so the smoke drifts rather than jumps
    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = (event.clientX - rect.left) / rect.width;
      pointer.targetY = 1 - (event.clientY - rect.top) / rect.height;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const start = performance.now();
    const draw = (now: number) => {
      resize();
      pointer.x += (pointer.targetX - pointer.x) * 0.04;
      pointer.y += (pointer.targetY - pointer.y) * 0.04;
      gl.uniform2f(iResolution, canvas.width, canvas.height);
      gl.uniform1f(iTime, (now - start) / 1000);
      gl.uniform2f(iMouse, pointer.x * canvas.width, pointer.y * canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    let frame = 0;
    const loop = (now: number) => {
      draw(now);
      frame = requestAnimationFrame(loop);
    };
    const play = () => { if (!frame) frame = requestAnimationFrame(loop); };
    const pause = () => { cancelAnimationFrame(frame); frame = 0; };
    const onVisibility = () => (document.hidden ? pause() : play());

    let observer: ResizeObserver | null = null;
    if (reduceMotion) {
      // one still frame, redrawn only when the size changes
      draw(start + 6000);
      observer = new ResizeObserver(() => draw(start + 6000));
      observer.observe(canvas);
    } else {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
      if (!document.hidden) play();
    }

    return () => {
      pause();
      observer?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [color, reduceMotion]);

  return (
    <div className={cn('pointer-events-none absolute inset-0 h-full w-full overflow-hidden bg-slab-black', className)} aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div className={cn('absolute inset-0', blurClassMap[backdropBlurAmount] ?? blurClassMap.sm)} />
    </div>
  );
}

// ── Login form ──────────────────────────────────────────────────────────────

export type AuthMode = 'login' | 'register';
export type AuthField = 'name' | 'email' | 'password' | 'confirm';
export type LoginFormValues = Record<AuthField, string>;

export interface LoginFormProps {
  mode: AuthMode;
  values: LoginFormValues;
  /** Field errors to show (already filtered to touched fields). */
  errors?: Partial<Record<AuthField, string>>;
  /** Error from the backend, shown above the fields. */
  formError?: string | null;
  busy?: boolean;
  remember: boolean;
  /** Changing it replays the shake that marks a failed submit. */
  shakeKey?: number;
  idPrefix?: string;
  headingLevel?: 'h1' | 'h2';
  /** Shown above the heading, e.g. the wordmark. */
  brand?: ReactNode;
  onChange: (field: AuthField, value: string) => void;
  onBlur?: (field: AuthField) => void;
  onRememberChange: (remember: boolean) => void;
  onSubmit: () => void;
  onModeChange: (mode: AuthMode) => void;
  /** Adds a close button (used in the login modal). */
  onClose?: () => void;
}

const COPY: Record<AuthMode, { title: string; sub: string; submit: string; busy: string; switchText: string; switchAction: string }> = {
  login: {
    title: 'Bienvenido de nuevo',
    sub: 'Inicia sesión para seguir donde lo dejaste.',
    submit: 'Iniciar sesión',
    busy: 'Entrando…',
    switchText: '¿Eres nuevo en CineTracker?',
    switchAction: 'Crea una cuenta',
  },
  register: {
    title: 'Crea tu cuenta',
    sub: 'Es gratis y tus datos se quedan en este computador.',
    submit: 'Crear cuenta',
    busy: 'Creando cuenta…',
    switchText: '¿Ya tienes una cuenta?',
    switchAction: 'Inicia sesión',
  },
};

// One ease across the app: exponential ease-out (DESIGN.md, Motion).
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch-light';

interface FloatingFieldProps {
  id: string;
  label: string;
  icon: ReactNode;
  type?: string;
  value: string;
  error?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  trailing?: ReactNode;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

/** Underlined input whose label sits inside and floats above once focused or filled; never placeholder-only. */
function FloatingField({ id, label, icon, type = 'text', value, error, autoComplete, autoFocus, maxLength, trailing, onChange, onBlur }: FloatingFieldProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        placeholder=" "
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        data-autofocus={autoFocus ? "" : undefined}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        // switching to another window also blurs the field; only leaving it within the app validates
        onBlur={() => { if (document.hasFocus()) onBlur?.(); }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'peer block w-full appearance-none rounded-none border-0 border-b-2 bg-transparent px-0 pb-2 pt-3 font-body text-base text-white outline-none transition-colors focus-visible:outline-none',
          // focus shows as the green underline and label; the app-wide outline would box the field
          'autofill:shadow-[inset_0_0_0_1000px_rgba(10,10,10,0.55)] [&:-webkit-autofill]:[-webkit-text-fill-color:#fff]',
          error ? 'border-red-300 focus:border-red-200' : 'border-white/45 focus:border-pitch-light',
          trailing ? 'pr-11' : '',
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute left-0 top-3 flex origin-[0] items-center gap-2 font-body text-base text-gray-200 transition-transform duration-200',
          '-translate-y-6 scale-75 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-6 peer-focus:scale-75',
          error ? 'text-red-200' : 'peer-focus:text-pitch-light',
        )}
      >
        {icon}
        {label}
      </label>
      {trailing && <div className="absolute bottom-1 right-0">{trailing}</div>}
      {error && <p id={`${id}-error`} role="alert" className="mt-2 font-body text-sm text-red-200">{error}</p>}
    </div>
  );
}

/**
 * A glass login / sign-up card with floating labels. It only renders: the
 * caller owns values, validation and submission (see AuthForm).
 */
export function LoginForm({
  mode,
  values,
  errors = {},
  formError,
  busy = false,
  remember,
  shakeKey = 0,
  idPrefix = 'auth',
  headingLevel = 'h1',
  brand,
  onChange,
  onBlur,
  onRememberChange,
  onSubmit,
  onModeChange,
  onClose,
}: LoginFormProps): JSX.Element {
  const reduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const copy = COPY[mode];
  const Heading = headingLevel;
  const id = (field: string) => `${idPrefix}-${field}`;
  const isRegister = mode === 'register';

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  const reveal = {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' },
    exit: { opacity: 0, height: 0 },
    transition: { duration: 0.24, ease: EASE_OUT } satisfies Transition,
    style: { overflow: 'hidden' as const },
  };

  return (
    <motion.div
      className="relative w-full max-w-sm space-y-6 rounded-2xl border border-white/20 bg-slab-black/60 p-8 shadow-2xl backdrop-blur-lg"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.36, ease: EASE_OUT }}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className={cn('absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-transparent text-gray-200 transition-colors hover:border-white hover:text-white', focusRing)}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}

      <div className="text-center">
        {brand && <div className="mb-5 flex justify-center">{brand}</div>}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <Heading className="m-0 font-display text-4xl font-normal uppercase leading-none text-white">{copy.title}</Heading>
            <p className="mt-3 font-body text-sm text-gray-200">{copy.sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.form
        key={shakeKey}
        onSubmit={submit}
        noValidate
        className="space-y-7"
        animate={shakeKey && !reduceMotion ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : undefined}
        transition={{ duration: 0.36 }}
      >
        <AnimatePresence initial={false}>
          {formError && (
            <motion.p key="form-error" role="alert" {...reveal} className="m-0 rounded-lg border border-red-300/60 bg-red-500/15 px-3 py-2 font-body text-sm text-red-100">
              {formError}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isRegister && (
            <motion.div key="name" {...reveal}>
              <div className="pt-4">
                <FloatingField
                  id={id('name')}
                  label="Nombre"
                  icon={<User size={16} aria-hidden="true" />}
                  value={values.name}
                  error={errors.name}
                  autoComplete="name"
                  autoFocus
                  maxLength={60}
                  onChange={(v) => onChange('name', v)}
                  onBlur={() => onBlur?.('name')}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <FloatingField
          id={id('email')}
          label="Correo"
          icon={<Mail size={16} aria-hidden="true" />}
          type="email"
          value={values.email}
          error={errors.email}
          autoComplete="email"
          autoFocus={!isRegister}
          onChange={(v) => onChange('email', v)}
          onBlur={() => onBlur?.('email')}
        />

        <FloatingField
          id={id('password')}
          label="Contraseña"
          icon={<Lock size={16} aria-hidden="true" />}
          type={showPassword ? 'text' : 'password'}
          value={values.password}
          error={errors.password}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          onChange={(v) => onChange('password', v)}
          onBlur={() => onBlur?.('password')}
          trailing={(
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className={cn('flex h-9 w-9 items-center justify-center rounded-md border-0 bg-transparent text-gray-200 hover:text-white', focusRing)}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          )}
        />

        <AnimatePresence initial={false}>
          {isRegister && (
            <motion.div key="confirm" {...reveal}>
              <div className="pt-4">
                <FloatingField
                  id={id('confirm')}
                  label="Repite la contraseña"
                  icon={<Lock size={16} aria-hidden="true" />}
                  type={showPassword ? 'text' : 'password'}
                  value={values.confirm}
                  error={errors.confirm}
                  autoComplete="new-password"
                  onChange={(v) => onChange('confirm', v)}
                  onBlur={() => onBlur?.('confirm')}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <label htmlFor={id('remember')} className="flex min-h-11 cursor-pointer items-center gap-3 font-body text-sm text-gray-200 hover:text-white">
          <input
            id={id('remember')}
            type="checkbox"
            checked={remember}
            onChange={(e) => onRememberChange(e.target.checked)}
            className={cn('h-[18px] w-[18px] shrink-0 accent-pitch', focusRing)}
          />
          <span>Mantener la sesión iniciada en este equipo</span>
        </label>

        <button
          type="submit"
          disabled={busy}
          className={cn(
            'group flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-0 bg-pitch px-4 py-3 font-num text-lg font-bold uppercase tracking-wider text-white transition-colors hover:bg-pitch-deep disabled:cursor-wait disabled:opacity-70',
            focusRing,
          )}
        >
          {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {busy ? copy.busy : copy.submit}
          {!busy && <ArrowRight size={20} aria-hidden="true" className="transition-transform motion-safe:group-hover:translate-x-1" />}
        </button>
      </motion.form>

      <p className="m-0 text-center font-body text-sm text-gray-200">
        {copy.switchText}{' '}
        <button
          type="button"
          onClick={() => onModeChange(isRegister ? 'login' : 'register')}
          className={cn('border-0 bg-transparent p-0 font-body text-sm font-semibold text-pitch-light underline underline-offset-4 hover:text-white', focusRing)}
        >
          {copy.switchAction}
        </button>
      </p>
    </motion.div>
  );
}
