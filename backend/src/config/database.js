const mongoose = require('mongoose');

const environment = require('./environment');

const connectDatabase = async () => {
  mongoose.connection.on('connected', () => {
    console.log('[database] MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[database] MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[database] MongoDB disconnected');
  });

  const connectionOptions = {
    autoIndex: environment.isProduction ? false : true,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 50,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
  };

  await mongoose.connect(environment.mongo.uri, connectionOptions);
  return mongoose.connection;
};

const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[database] MongoDB disconnected gracefully');
  }
};

module.exports = { connectDatabase, disconnectDatabase };