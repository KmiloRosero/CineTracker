import React from 'react';
import LiquidMetalShader from '@/components/ui/liquid-metal-shader';
import { useTheme } from '../hooks/useTheme';
import { useAppPref, BACKGROUND_PREF } from '../hooks/useAppPref';

// Pitch-green liquid metal behind the pages. A theme scrim on top keeps every
// text AA: dark pages see the metal through 50–62% black, light pages through
// 88% chalk. It drifts slowly at a reduced resolution; Perfil can hold it still.
const PALETTE = {
  dark:  { base: '#0a1a12', metal: '#11603c', highlight: '#1fb574' },
  light: { base: '#c9d6cd', metal: '#7fbf9e', highlight: '#f4f4f0' },
};

export default function AppBackground() {
  const [theme] = useTheme();
  const [mode] = useAppPref(...BACKGROUND_PREF);
  const colors = PALETTE[theme] ?? PALETTE.dark;

  return (
    <div className="app-bg" aria-hidden="true">
      <LiquidMetalShader
        className="app-bg__shader"
        baseColor={colors.base}
        metalColor={colors.metal}
        highlightColor={colors.highlight}
        speed={mode === 'animated' ? 0.32 : 0}
        distortion={0.55}
        scale={1.15}
        pixelRatio={0.75}
        interactive={false}
      />
      <div className="app-bg__scrim" />
    </div>
  );
}
