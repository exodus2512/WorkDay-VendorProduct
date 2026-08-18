/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Disables the buggy build trace collector in Next.js 14 App Router
  // that incorrectly looks for Pages Router files (_app.js, _document.js)
  // even when only the App Router (app/) directory is used.
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        './node_modules/@swc/**',
        './node_modules/webpack/**',
      ],
    },
  },
};

export default nextConfig;
