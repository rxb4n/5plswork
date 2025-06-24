const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Important for Render.com WebSocket support
  async rewrites() {
    return [
      {
        source: '/api/socketio',
        destination: '/api/socketio',
      },
    ];
  },
}

module.exports = nextConfig