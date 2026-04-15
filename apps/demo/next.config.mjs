/** @type {import('next').NextConfig} */
const nextConfig = {
  // StrictMode ejecuta useEffect 2x en dev → crea 2 SimliClients concurrentes → startup_error
  reactStrictMode: false,
  // Permite importar packages del monorepo directamente desde src/
  transpilePackages: ['@agent-forge/business-data', '@agent-forge/tools', '@agent-forge/prompt-levels', '@agent-forge/prompt-designer'],
};

export default nextConfig;
