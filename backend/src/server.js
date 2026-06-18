import config from './config/env.config.js';
import connectDB from './config/db.config.js';
import app from './app.js';
import logger from './utils/logger.js';

/* ------------------------------------------------------------------ */
/*  Uncaught Exception Handler (must be registered first)             */
/* ------------------------------------------------------------------ */

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

/* ------------------------------------------------------------------ */
/*  Start Server                                                      */
/* ------------------------------------------------------------------ */

const startServer = async () => {
  await connectDB();

  const server = app.listen(config.port, () => {
    logger.info(
      `Server running on port ${config.port} in ${config.env} mode`,
    );
  });

  /* ---------------------------------------------------------------- */
  /*  Unhandled Rejection Handler                                     */
  /* ---------------------------------------------------------------- */

  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION', {
      error: err.message,
    });
    server.close(() => process.exit(1));
  });
};

startServer();
