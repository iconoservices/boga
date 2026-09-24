'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function trackPixel(event: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    if (data) {
      window.fbq('track', event, data);
    } else {
      window.fbq('track', event);
    }
  }
}

interface PixelEventProps {
  event?: string;
  data?: Record<string, unknown>;
}

export default function PixelEvent({ event = 'ViewContent', data }: PixelEventProps) {
  useEffect(() => {
    trackPixel(event, data);
  }, [event, JSON.stringify(data)]);

  return null;
}
