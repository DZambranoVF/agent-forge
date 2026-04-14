/** @type {import('next').NextConfig} */
const nextConfig = {
  // StrictMode ejecuta useEffect 2x en dev → crea 2 SimliClients concurrentes → startup_error
  reactStrictMode: false,
};

export default nextConfig;
