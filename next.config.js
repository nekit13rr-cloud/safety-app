/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfignpm run build
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Отключаем предварительный рендеринг
  staticPageGenerationTimeout: 1,
  serverRuntimeConfig: {
    // Отключаем prerendering
    isDev: process.env.NODE_ENV === 'development',
  },
}

module.exports = nextConfig