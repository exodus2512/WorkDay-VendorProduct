// This empty file exists to satisfy the Next.js 14 build tracer.
// Next.js App Router projects still have the tracer look for this Pages Router
// file during `collect-build-traces`. Without it, an ENOENT error occurs.
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
