/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    serverComponentsExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static', 'ffprobe-static'],
  },
};

module.exports = nextConfig;
