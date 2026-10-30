export default function CityIcon({ id }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (id === 'food') {
    return (
      <svg {...common}>
        <path d="M4 3v7a3 3 0 0 0 6 0V3" />
        <path d="M7 3v18" />
        <path d="M14 3v18" />
        <path d="M14 8h5a2 2 0 0 1 0 4h-5" />
      </svg>
    );
  }
  if (id === 'housing') {
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    );
  }
  if (id === 'health') {
    return (
      <svg {...common}>
        <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z" />
      </svg>
    );
  }
  if (id === 'phone') {
    return (
      <svg {...common}>
        <path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" />
      </svg>
    );
  }
  if (id === 'work') {
    return (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }
  if (id === 'child') {
    return (
      <svg {...common}>
        <circle cx="8" cy="7" r="3" />
        <circle cx="17" cy="8" r="2" />
        <path d="M2 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
        <path d="M17 14a4 4 0 0 1 4 4v2" />
      </svg>
    );
  }
  if (id === 'transit') {
    return (
      <svg {...common}>
        <rect x="6" y="3" width="12" height="14" rx="2" />
        <path d="M6 11h12" />
        <path d="M8 21l2-4" />
        <path d="M16 21l-2-4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 20V10l8-6 8 6v10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
