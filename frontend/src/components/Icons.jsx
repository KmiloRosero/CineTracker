import React from 'react';

// One icon family for the whole app: 24px grid, 2px stroke, square caps,
// mitred joins (the broadcast world's hard edges). Size comes from CSS or `size`.
function Svg({ size = 18, strokeWidth = 2, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome    = (p) => <Svg {...p}><path d="M3 10l9-7 9 7v11H3z"/><path d="M9 21v-7h6v7"/></Svg>;
export const IconFilm    = (p) => <Svg {...p}><rect x="3" y="3" width="18" height="18"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></Svg>;
export const IconTv      = (p) => <Svg {...p}><rect x="2" y="4" width="20" height="13"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Svg>;
export const IconChart   = (p) => <Svg {...p}><line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="18" y1="20" x2="18" y2="10"/><line x1="3" y1="20" x2="21" y2="20"/></Svg>;
export const IconList    = (p) => <Svg {...p}><line x1="9" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><rect x="3" y="5" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/><rect x="3" y="17" width="2" height="2"/></Svg>;
export const IconUser    = (p) => <Svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></Svg>;
export const IconSearch  = (p) => <Svg {...p}><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></Svg>;
export const IconPlus    = (p) => <Svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>;
export const IconClose   = (p) => <Svg {...p}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></Svg>;
export const IconCheck   = (p) => <Svg strokeWidth={2.5} {...p}><polyline points="5 12 10 17 19 7"/></Svg>;
export const IconTrash   = (p) => <Svg {...p}><polyline points="4 7 20 7"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></Svg>;
export const IconEdit    = (p) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z"/><line x1="13" y1="7" x2="17" y2="11"/></Svg>;
export const IconGrid    = (p) => <Svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></Svg>;
export const IconRows    = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="4"/><rect x="3" y="10" width="18" height="4"/><rect x="3" y="16" width="18" height="4"/></Svg>;
export const IconArrowRight = (p) => <Svg {...p}><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></Svg>;
export const IconUpload  = (p) => <Svg {...p}><line x1="12" y1="15" x2="12" y2="3"/><polyline points="7 8 12 3 17 8"/><path d="M4 15v6h16v-6"/></Svg>;
export const IconSun     = (p) => <Svg {...p}><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/></Svg>;
export const IconMoon    = (p) => <Svg {...p}><path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z"/></Svg>;
export const IconLogIn   = (p) => <Svg {...p}><path d="M14 3h6v18h-6"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></Svg>;
export const IconAlert   = (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="12" y1="16" x2="12" y2="17"/></Svg>;

export const IconPlay    = (p) => <Svg {...p}><polygon points="7 4 20 12 7 20" fill="currentColor"/></Svg>;
export const IconExternal = (p) => <Svg {...p}><path d="M14 4h6v6"/><line x1="20" y1="4" x2="11" y2="13"/><path d="M18 14v6H4V6h6"/></Svg>;

export const IconCompass = (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5"/></Svg>;
export const IconCalendar = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="16"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/><rect x="7" y="13" width="3" height="3" fill="currentColor" stroke="none"/></Svg>;
export const IconSidebar = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16"/><line x1="9" y1="4" x2="9" y2="20"/></Svg>;
export const IconLogOut  = (p) => <Svg {...p}><path d="M10 3H4v18h6"/><polyline points="15 7 20 12 15 17"/><line x1="20" y1="12" x2="9" y2="12"/></Svg>;

export function IconSpinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
