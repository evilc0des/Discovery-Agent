import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas', '@napi-rs/canvas-linux-x64-musl'],
};

export default nextConfig;
