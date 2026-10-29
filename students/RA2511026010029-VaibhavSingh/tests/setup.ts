import '@testing-library/jest-dom';
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util';

if (typeof globalThis.TextEncoder === 'undefined' || globalThis.TextEncoder !== NodeTextEncoder) {
  (globalThis as any).TextEncoder = NodeTextEncoder;
  (globalThis as any).TextDecoder = NodeTextDecoder;
}

// Mock canvas getContext for jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}

// Mock matchMedia for jsdom
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock window.speechSynthesis
if (typeof window !== 'undefined') {
  (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    getVoices: () => [],
    speaking: false,
    pending: false,
    paused: false,
  };
}
