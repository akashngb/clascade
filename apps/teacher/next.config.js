/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow iframes from the renderer dev server
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ];
  },
};

module.exports = nextConfig;
