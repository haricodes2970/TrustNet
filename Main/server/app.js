const express = require('express');
const cookieParser = require('cookie-parser');

const corsMiddleware = require('./src/middlewares/cors');
const { compressionMiddleware } = require('./src/middlewares/compression');
const { helmetMiddleware } = require('./src/middlewares/helmet');
const logger = require('./src/middlewares/logger');
const notFound = require('./src/middlewares/notFound');
const errorHandler = require('./src/middlewares/errorHandler');
const healthRoutes = require('./src/routes/health.routes');
const apiRoutes = require('./src/routes');
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./src/docs/swagger');

const app = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.options(/.*/, corsMiddleware);
app.use(compressionMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(logger);
app.use('/', healthRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.use('/api/v1', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
