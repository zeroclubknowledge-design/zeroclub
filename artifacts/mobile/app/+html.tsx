import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
            *, *::before, *::after { box-sizing: border-box; }
            input, textarea, select, button {
              outline: none !important;
              box-shadow: none !important;
              -webkit-tap-highlight-color: transparent;
            }
            input:focus, textarea:focus, select:focus {
              outline: none !important;
              box-shadow: none !important;
            }
            * { -webkit-tap-highlight-color: transparent; }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
