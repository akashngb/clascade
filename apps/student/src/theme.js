// Shared visual language for the biology lesson. Keeping palette + tunables in
// one place keeps the "clean and perfect" bar consistent across scene and UI.
export const theme = {
  bg: {
    cytoplasm: '#0a1420',
    nucleus: '#0b0f1e',
  },
  fog: {
    cytoplasm: { color: '#0a1420', near: 8, far: 34 },
    nucleus: { color: '#0b0f1e', near: 6, far: 26 },
  },
  helix: {
    backbone: '#3b82f6',
    backboneEmissive: '#1e3a8a',
  },
  ui: {
    ink: '#e8eef7',
    inkDim: '#9fb0c7',
    accent: '#5eead4',
    accentDim: '#2dd4bf',
    panel: 'rgba(10, 16, 26, 0.72)',
    panelBorder: 'rgba(94, 234, 212, 0.22)',
    good: '#4ade80',
    bad: '#f87171',
  },
};

export default theme;
