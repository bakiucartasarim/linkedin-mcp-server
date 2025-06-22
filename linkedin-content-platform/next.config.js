/** @type {import('next').NextConfig} */
const nextConfig = {
  // serverActions artık varsayılan olarak etkin, bu yüzden kaldırıldı
  // experimental: {
  //   serverActions: true,
  // },
  images: {
    domains: ['localhost', 'socialhub.atalga.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // ESLint kontrollerini derleme sırasında devre dışı bırak
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
