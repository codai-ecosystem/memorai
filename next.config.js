/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Remove deprecated turbo config
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    SERVICE_NAME: 'memorai',
    SERVICE_PORT: '4002',
  },
  webpack: (config, { isServer }) => {
    // Fix module resolution issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Reduce memory usage  
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
