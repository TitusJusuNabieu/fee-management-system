module.exports = {
  apps: [
    {
      name: "enc-ticket",
      script: "node_modules/.bin/next",
      args: "start -p 1300",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env_production: {
        NODE_ENV: "production",
        PORT: "1300",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      merge_logs: true,
    },
  ],
};
