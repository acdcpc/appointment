import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Custom HTML shell for the exported static web/PWA build.
 * Injects the web manifest, PWA theme, and iOS "Add to Home Screen" meta tags
 * so the deployed site is installable on Android Chrome and iOS Safari.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="description" content="Rainbow Child Development Clinic — pediatric appointments, records, and family care with Dr. Anil Ojha." />
        <meta name="theme-color" content="#0E7490" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* iOS classic PWA meta tags (iOS < 16.4 and Share-sheet hints) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rainbow Clinic" />
        <meta name="format-detection" content="telephone=yes" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
