require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Falta la variable de entorno ${envVar}`);
  }
});
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  await connectDB();

  server = app.listen(PORT, () => console.log(`Servidor iniciado en ${PORT}`));
};

startServer().catch((error) => {
  console.error('Error al iniciar servidor:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
