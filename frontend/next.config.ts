import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Menonaktifkan optimizations yang mungkin menyebabkan error
  optimizeFonts: false,
  // Konfigurasi tambahan lainnya
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
