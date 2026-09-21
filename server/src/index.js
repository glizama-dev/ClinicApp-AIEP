'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const { notFound, errorHandler } = require('./middleware/error');
const authRoutes = require('./routes/auth.routes');
const fichasRoutes = require('./routes/fichas.routes');

const app = express();

// Detras de un proxy inverso en produccion (nginx, etc.).
if (config.env === 'production') app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin, credentials: false }));
app.use(express.json({ limit: '5mb' })); // las firmas en dataURL pesan
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: config.env, time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/fichas', fichasRoutes);
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

app.listen(config.port, () => {
  console.log(`[clinicapp] API escuchando en http://localhost:${config.port} (${config.env})`);
});
