const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TrustNet API',
      version: '1.0.0',
      description: 'Production-ready API documentation for TrustNet.',
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
const swaggerUiOptions = {};

module.exports = { swaggerSpec, swaggerUi, swaggerUiOptions };
