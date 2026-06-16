// theme.js — Soft blue-gray professional theme

export const colors = {
  // Primary blue
  primary:       '#1a56db',
  primaryLight:  '#ebf5ff',
  primaryDark:   '#1e429f',

  // Status colors
  success:       '#057a55',
  successLight:  '#f3faf7',
  successBorder: '#bcf0da',
  danger:        '#e02424',
  dangerLight:   '#fdf2f2',
  dangerBorder:  '#f8b4b4',
  warning:       '#c27803',
  warningLight:  '#fdfdea',
  warningBorder: '#fce96a',

  // Text
  text:          '#111928',
  textMuted:     '#6b7280',
  textLight:     '#9ca3af',

  // Backgrounds — soft blue-gray palette
  bg:            '#f0f4f8',
  bgCard:        '#ffffff',
  bgSection:     '#f8fafc',
  bgHover:       '#f1f5f9',
  bgActive:      '#e8f0fe',

  // Borders
  border:        '#e2e8f0',
  borderDark:    '#cbd5e1',

  // Sidebar and header
  sidebar:       '#ffffff',
  sidebarActive: '#ebf5ff',
  header:        '#ffffff',

  // Chart / indicator backgrounds
  chartBg:       '#f8fafc',
  inputBg:       '#f8fafc',
};

export const shadow = {
  xs: '0 1px 2px rgba(0,0,0,0.05)',
  sm: '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  md: '0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
  lg: '0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
};

export const card = {
  background:   colors.bgCard,
  borderRadius: 12,
  border:       `1px solid ${colors.border}`,
  boxShadow:    shadow.sm,
  padding:      '18px 20px',
};

export const inputStyle = {
  width:        '100%',
  padding:      '9px 12px',
  background:   colors.inputBg,
  border:       `1px solid ${colors.border}`,
  borderRadius: 8,
  fontSize:     13,
  color:        colors.text,
  outline:      'none',
  fontFamily:   'inherit',
};