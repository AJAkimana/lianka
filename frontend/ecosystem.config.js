module.exports = {
  apps: [
    {
      name: 'lianka-frontend',
      cwd: '.next/standalone',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      time: true,
    },
  ],
};
