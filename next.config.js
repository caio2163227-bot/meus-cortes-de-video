/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    serverComponentsExternalPackages: [
      'fluent-ffmpeg',
      'ffmpeg-static',
      'ffprobe-static',
      'yt-dlp-exec',
      '@tensorflow/tfjs-node',
      '@vladmandic/face-api',
    ],
  },
};

module.exports = nextConfig;
