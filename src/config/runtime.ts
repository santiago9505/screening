const configuredApiRoot = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : '';

export const isLocalRuntime =
  browserProtocol === 'file:' ||
  browserHost === 'localhost' ||
  browserHost === '127.0.0.1';

export const apiRoot = configuredApiRoot || (isLocalRuntime ? 'http://localhost:3002/api' : '/api');

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiRoot}${normalizedPath}`;
};

export const shouldPreferDirectMarketData = !configuredApiRoot && !isLocalRuntime;
