const http = require('http');

const environment = require('./src/config/environment');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');
const app = require('./src/app');

const startServer = async () => {
  try {
    await connectDatabase();

    const server = http.createServer(app);

    server.listen(environment.port, () => {
      console.log(
        `[server] veerSetu backend listening on port ${environment.port} (${environment.nodeEnv})`
      );
    });

    const shutdown = async (signal) => {
      console.log(`\n[server] ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
      // Safety net: if connections refuse to drain, exit after 10s.
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    return server;
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };