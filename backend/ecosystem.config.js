module.exports = {
  apps: [
    {
      name: 'lianka-backend',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: '3001',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      env_file: '.env',
      time: true,
    },
  ],
};
