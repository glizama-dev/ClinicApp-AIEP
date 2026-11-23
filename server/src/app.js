'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const { notFound, errorHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth.routes');
const fichasRoutes = require('./routes/fichas.routes');
const contactRoutes = require('./routes/contact.routes');

const app = express();

// Detras de un proxy inverso en produccion (nginx, etc.).
if (config.env === 'production') app.set('trust proxy', 1);

app.disable('x-powered-by');

// Content-Security-Policy: solo scripts propios (sin inline), imagenes propias
// o en dataURL (fotos/firmas), fuentes de Google Fonts. Es la segunda barrera
// contra XSS si algun dato malicioso llegara a renderizarse.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: config.env === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: config.corsOrigin, credentials: false }));
app.use(express.json({ limit: '5mb' })); // las firmas en dataURL pesan
if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/fichas', fichasRoutes);
app.use('/api/contacto', contactRoutes);
app.use('/api', notFound);

// No exponer el codigo del backend por HTTP cuando STATIC_DIR es la raiz del repo.
app.use((req, res, next) => {
  if (req.path === '/server' || req.path.startsWith('/server/')) {
    return res.status(404).end();
  }
  return next();
});

// Frontend estatico.
app.use(express.static(config.staticDir, { dotfiles: 'ignore', extensions: ['html'] }));
app.get('/', (req, res) => res.sendFile(path.join(config.staticDir, 'index.html')));
app.use((req, res) => res.status(404).send('No encontrado'));

app.use(errorHandler);

module.exports = app;
