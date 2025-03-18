/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    env: {
      // HTTP/HTTPS API endpoint
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      
      // WebSocket endpoint
      NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
      
      // LSP Backend endpoint
      NEXT_PUBLIC_LSP_HOST: process.env.NEXT_PUBLIC_LSP_HOST || 'localhost',
      NEXT_PUBLIC_LSP_PORT: process.env.NEXT_PUBLIC_LSP_PORT || '30001',
    },
  }
  
  module.exports = nextConfigw