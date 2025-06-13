/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // Enable the latest features
        turbo: {
            rules: {
                '*.svg': {
                    loaders: ['@svgr/webpack'],
                    as: '*.js',
                },
            },
        },
    },
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Warning: This allows production builds to successfully complete even if
        // your project has type errors.
        ignoreBuildErrors: true,
    },
    images: {
        domains: ['localhost'],
    },
    // Keep compatibility with existing Express server
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:6366/api/:path*',
            },
        ];
    },
}

module.exports = nextConfig;
