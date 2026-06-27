// NovaChat Custom SVG Icons — all UI icons are unique designs
const Icons = {
  _cache: {},

  // Build an SVG element from an icon name
  create(name, size) {
    const svgCode = this[name];
    if (!svgCode) return null;
    const s = size || 22;
    const wrap = svgCode.replace('<svg ', `<svg width="${s}" height="${s}" `);
    const div = document.createElement('div');
    div.innerHTML = wrap;
    return div.firstElementChild;
  },

  // Replace all [data-icon] elements in a container
  apply(container) {
    const root = container || document;
    root.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.dataset.icon;
      const size = el.dataset.iconSize || 20;
      const svg = this.create(name, parseInt(size));
      if (svg) {
        svg.style.cssText = 'display:block;pointer-events:none;';
        el.textContent = '';
        el.appendChild(svg);
      }
    });
  },

  // === LOGO ===
  logo: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="24" height="24" rx="6" fill="currentColor" opacity="0.15"/>
    <path d="M16 8 L24 16 L16 24 L8 16Z" fill="currentColor" opacity="0.6"/>
    <circle cx="16" cy="16" r="4" fill="currentColor"/>
  </svg>`,

  // === NAVIGATION / ACTIONS ===
  plus: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/>
    <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  settings: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/>
    <path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  </svg>`,

  power: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2v10M18.36 5.64a9 9 0 11-12.72 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  back: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  close: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.4" fill="none" opacity="0.3"/>
    <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  refresh: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12a9 9 0 11-3-6.68" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21 3v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // === CHAT ===
  emoji: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor"/>
    <circle cx="15.5" cy="9.5" r="1.5" fill="currentColor"/>
    <path d="M8 15c1.5 2 4.5 2 6 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  send: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12l18-9-9 18-3-6-6-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="currentColor" fill-opacity="0.2"/>
    <path d="M12 12L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // === CALLS ===
  phone: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`,

  phoneSlash: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" opacity="0.4"/>
    <path d="M23 1L1 23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  phoneCall: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`,

  phoneEnd: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M17 1l-6 6M11 1l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  video: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/>
    <path d="M17 10l5-3v10l-5-3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`,

  videoOff: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.6" opacity="0.4"/>
    <path d="M17 10l5-3v10l-5-3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" opacity="0.4"/>
    <path d="M23 1L1 23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  // === VOICE ===
  mic: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.6"/>
    <path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  micOff: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.6" opacity="0.4"/>
    <path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.4"/>
    <path d="M23 1L1 23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  // === AUDIO PLAYER ===
  play: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.4"/>
    <path d="M10 8v8l6-4-6-4z" fill="currentColor"/>
  </svg>`,

  pause: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.4"/>
    <rect x="8" y="7" width="3" height="10" rx="1" fill="currentColor"/>
    <rect x="13" y="7" width="3" height="10" rx="1" fill="currentColor"/>
  </svg>`,

  // === WELCOME ===
  welcome: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="40" height="28" rx="6" stroke="currentColor" stroke-width="2" opacity="0.3"/>
    <path d="M12 18h24M12 24h16M12 30h20" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.2"/>
    <circle cx="36" cy="36" r="8" stroke="currentColor" stroke-width="2" fill="none" opacity="0.5"/>
    <path d="M33 36h6M36 33v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
  </svg>`,

  // === EMPTY STATES ===
  chatEmpty: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="32" height="24" rx="4" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
    <path d="M12 14h16M12 19h12M12 24h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.15"/>
    <circle cx="32" cy="30" r="6" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <path d="M30 30h4M32 28v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
  </svg>`,

  searchEmpty: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="17" cy="17" r="9" stroke="currentColor" stroke-width="2" opacity="0.2"/>
    <path d="M24 24l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.15"/>
    <path d="M12 17h10M17 12v10" stroke="currentColor" stroke-width="1.5" opacity="0.15"/>
  </svg>`,

  // === TOGGLE / STATUS ===
  check: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // === CALL STATUS ===
  callEnd: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M17 1l-6 6M11 1l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`
};
